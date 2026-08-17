#Requires AutoHotkey v2.0
#SingleInstance Force
SetWorkingDir A_ScriptDir
SetTitleMatchMode 2          ; match window titles by "contains"
CoordMode "Mouse", "Screen"  ; all coords are absolute screen pixels
CoordMode "ToolTip", "Screen"

; =====================================================================
;  Allflame Voyage - bulk chart + board-border importer  (AutoHotkey v2)
;
;  Three phases:
;    Phase 1 - stays in PoE, hovers every cell and Ctrl+C's it, appending
;              each chart's text into one buffer (no window switching).
;    Phase 2 - hovers the 12 board-border modifiers. A temporary PowerShell
;              helper captures the PoE window and reads each tooltip with the
;              Windows OCR engine. Screenshots never leave the PC.
;    Phase 3 - switches to the browser ONCE and pastes the whole buffer;
;              the solver parses and imports every chart from that one paste.
;    Empty cells copy nothing and are skipped.
;    English and Korean client Chart headers are both supported.
;
;  ---------------------------------------------------------------
;  ONE-TIME SETUP
;   1. Install AutoHotkey v2  (https://www.autohotkey.com/).
;   2. In PoE open the Voyage board so the Chart panel is fully
;      visible and NOT scrolled. Use Windowed or Windowed Fullscreen
;      (exclusive fullscreen can block the mouse/keys).
;   3. Open the solver in your browser; the tab title must contain
;      "Allflame Voyage Solver", and click once inside the page so
;      focus is on the page (not the address bar).
;   4. Double-click this file to run it (it lives in the tray).
;
;  CALIBRATION (the Setup wizard walks you through it)
;   The wizard opens on first run; later it lives in the tray menu
;   ("Setup wizard..."). One key does it all: hover whatever the wizard
;   asks for and press F7 - chart grid corners, then each of the 12
;   border points, then an optional aim preview.
;   - Set GridCols / GridRows below to match your panel.
;
;  RUN
;   F9  = do the real import sweep (charts + borders)
;   Shift+F9 = import the 12 borders only (no chart copying)
;   F10 = abort at any time
;   All keys are rebindable: right-click (or double-click) the tray icon
;   and choose "Keybinds...". Saved to voyage-import.ini.
;   The calibration key (F7) only works while the Setup wizard is open
;   (tray icon -> "Setup wizard...").
;
;  If PoE is running as administrator, run this script as admin too,
;  or its keypresses won't reach the game. Don't touch the mouse or
;  keyboard while it's sweeping.
;  If you've bound Inventory (or anything else) to the C key, move that
;  bind before importing: PoE hardcodes item-copy to Ctrl+C, and on
;  empty cells the game lets the C fall through to your bind, flapping
;  panels mid-sweep (issue #37).
; =====================================================================

; ---------------- CONFIG ----------------
; PoE window titles, matched by "contains" (case-sensitive in AHK v2).
; The international client's window is titled "Path of Exile". CN-client
; windows seen in the wild are "流放之路" and "Path Of Exile Game Client",
; and the TW (Garena) client may be titled "流亡黯道", so all are accepted.
; The first title is checked first.
PoeWinTitles := ["Path of Exile", "PathOfExile", "流放之路", "Path Of Exile Game Client", "流亡黯道"]
PoeWinTitle  := PoeWinTitles[1]  ; primary title (kept for reference/messages)
BrowserWinTitle := "Allflame Voyage Solver"  ; the solver's browser tab title

; Find the PoE game window among all known titles (returns its hwnd, or 0).
FindPoeWindow() {
    for t in PoeWinTitles
        if (hwnd := WinExist(t))
            return hwnd
    return 0
}

GridCols := 6    ; columns in the Chart panel
GridRows := 10   ; rows to sweep (overshooting is fine - empty cells skip)

ActivateDelay := 60    ; ms after focusing a window (paid only ~twice total now)
HoverDelay    := 28    ; ms for PoE to register the cursor before Ctrl+C
BorderHoverDelay := 250 ; ms for a border tooltip to appear before OCR capture
BorderOcrAttempts := 2  ; retry once when both filtered and unfiltered OCR are empty
BorderPreviewDelay := 900 ; ms per point during the Ctrl+F4 visual preview
PasteDelay    := 90    ; ms after the single big paste
ClipTimeout   := 0.2   ; seconds to wait for Ctrl+C (only empty cells wait the full time)
PageFlipDelay := 150   ; ms for the chart panel to redraw after clicking a page tab
AltRevealDelay := 350  ; ms for held-Alt to reveal every border tooltip at once
OcrTimeout    := 90    ; seconds before a stuck Windows OCR scan is stopped
; Override the border-OCR recognition language. Leave empty to auto-detect.
; - CN client window ("流放之路" / "Path Of Exile Game Client"): "zh-CN" plus
;   the Windows Simplified-Chinese OCR feature (Language.OCR~~~zh-Hans).
; - TW client window ("流亡黯道"): "zh-Hant" plus the Windows Traditional-
;   Chinese OCR feature (Language.OCR~~~zh-Hant).
; Auto-detect checks the game process name (_CN/_TW/_KG) and the window title.
OcrLanguage   := ""
; If it ever MISSES a chart, raise HoverDelay ~10ms at a time (the cursor
; isn't settling before Ctrl+C). If the final paste drops some, raise PasteDelay.
; ----------------------------------------

; version stamp - shown in diagnostic bundles so reports say what they ran
ScriptVersion := "2026-08-14"

IniFile := A_ScriptDir "\voyage-import.ini"
TLx := IniRead(IniFile, "grid", "TLx", "0") + 0
TLy := IniRead(IniFile, "grid", "TLy", "0") + 0
BRx := IniRead(IniFile, "grid", "BRx", "0") + 0
BRy := IniRead(IniFile, "grid", "BRy", "0") + 0
; the chart panel gained a second page - the sweep clicks these tab buttons
Page1TabX := IniRead(IniFile, "pages", "Tab1X", "0") + 0
Page1TabY := IniRead(IniFile, "pages", "Tab1Y", "0") + 0
Page2TabX := IniRead(IniFile, "pages", "Tab2X", "0") + 0
Page2TabY := IniRead(IniFile, "pages", "Tab2Y", "0") + 0
PagesCalibrated() {
    global Page1TabX, Page1TabY, Page2TabX, Page2TabY
    return (Page1TabX || Page1TabY) && (Page2TabX || Page2TabY)
}
; after this many fully blank ROWS in a row the sweep skips the rest of the
; page. 0 = never skip (for players who park charts past big gaps). Set in
; the wizard's "Sweep speed" step.
EmptySkipRows := IniRead(IniFile, "sweep", "EmptySkipRows", "2") + 0
; support escape hatch: set AltScan=0 under [sweep] in the ini to skip the
; one-screenshot Alt border scan entirely and always hover each border
AltScanBorders := IniRead(IniFile, "sweep", "AltScan", "1") + 0
; screen capture backend for border OCR: auto = Windows.Graphics.Capture
; with HDR tone mapping when Windows HDR is detected, plain GDI otherwise;
; gdi / wgc force one path (issue #33)
CaptureMode := IniRead(IniFile, "sweep", "Capture", "auto")
BorderTLx := IniRead(IniFile, "board", "TopLeftX", "0") + 0
BorderTLy := IniRead(IniFile, "board", "TopY", "0") + 0
BorderBRx := IniRead(IniFile, "board", "BottomRightX", "0") + 0
BorderBRy := IniRead(IniFile, "board", "BottomY", "0") + 0
ExactBorderPoints := []
Loop 12 {
    exactX := IniRead(IniFile, "board-exact", "Point" A_Index "X", "0") + 0
    exactY := IniRead(IniFile, "board-exact", "Point" A_Index "Y", "0") + 0
    if (exactX = 0 && exactY = 0) {
        ExactBorderPoints := []
        break
    }
    ExactBorderPoints.Push([exactX, exactY])
}
ExactBorderNext := 0
ScriptPid := ProcessExist()
; %TEMP% can arrive as an 8.3 short path (C:\Users\HARDPC~1\...) and
; PowerShell's path normalizer chokes on the "~" component (issue #27) -
; expand to the real long path before any helper paths are built.
LongPath(path) {
    buf := Buffer(1040, 0)
    len := DllCall("GetLongPathNameW", "Str", path, "Ptr", buf.Ptr, "UInt", 520, "UInt")
    return (len > 0 && len <= 520) ? StrGet(buf, "UTF-16") : path
}
TempDir := LongPath(A_Temp)
OcrHelper := TempDir "\voyage-border-ocr-" ScriptPid ".ps1"
OcrOutput := TempDir "\voyage-border-ocr-" ScriptPid ".txt"
OcrSession := TempDir "\voyage-border-ocr-" ScriptPid
OcrPid := 0
Running := false

; ---------------- ACTIVITY LOG ----------------
; Small rolling log beside the script. The diagnostic bundle ships it, so
; "it didn't work" reports arrive with what actually happened. Capped at
; ~256 KB - the oldest half is dropped when it grows past that.
LogFile := A_ScriptDir "\voyage-import.log"
Log(msg) {
    global LogFile
    try {
        size := 0
        try size := FileGetSize(LogFile)
        if (size > 262144) {
            keep := SubStr(FileRead(LogFile, "UTF-8"), -131072)
            FileDelete LogFile
            FileAppend keep, LogFile, "UTF-8"
        }
        FileAppend FormatTime(, "yyyy-MM-dd HH:mm:ss") " | " msg "`n", LogFile, "UTF-8"
    }
}
Log("started v" ScriptVersion " | AHK " A_AhkVersion " | Windows " A_OSVersion
    . " | screen " A_ScreenWidth "x" A_ScreenHeight " @ " A_ScreenDPI " DPI | monitors " MonitorGetCount())

; keep the last OCR / chart text around for the diagnostic bundle
SaveDiagText(name, text) {
    global TempDir
    path := TempDir "\voyage-diag-" name ".txt"
    try FileDelete path
    try FileAppend text, path, "UTF-8"
}

CleanupOcr(*) {
    global OcrHelper, OcrOutput, OcrPid, OcrSession
    if OcrPid && ProcessExist(OcrPid)
        try ProcessClose OcrPid
    try FileDelete OcrHelper
    try FileDelete OcrOutput
    try FileDelete OcrSession ".cmd"
    try FileDelete OcrSession ".cmd.tmp"
    try FileDelete OcrSession ".ready"
    try FileDelete OcrSession "-res-all.txt"
    try FileDelete OcrSession "-shot-all.txt"
    Loop 12
        try FileDelete OcrSession "-res-" (A_Index - 1) ".txt"
}
OnExit CleanupOcr

; ---------------- KEYBINDS ----------------
; Every hotkey is rebindable: right-click the tray icon -> "Keybinds..."
; (or double-click it). Choices are saved to voyage-import.ini [keys] and
; applied immediately. Modifier syntax: ^ Ctrl, ! Alt, + Shift.
KeyDefs := [
    ["RunSweep",      "F9",  "Run import (charts + border OCR)"],
    ["BordersOnly",   "+F9", "Import borders only (OCR, no charts)"],
    ["Abort",         "F10", "Abort"],
    ["WizardSet",     "F7",  "Set the current wizard point (wizard only)"],
]
KeyActions := Map(
    "RunSweep", RunSweep,
    "BordersOnly", RunBordersOnly,
    "Abort", AbortAll,
    "WizardSet", WizardSetPressed,
)
Keys := Map()
for def in KeyDefs
    Keys[def[1]] := IniRead(IniFile, "keys", def[1], def[2])
RegisteredKeys := []

; the calibration key exists only while the Setup wizard is open - day to day
; the script holds just Run / Borders-only / Abort
WIZARD_ONLY := Map("WizardSet", 1)

WizardActive() {
    global WizardGui
    return IsSet(WizardGui) && IsObject(WizardGui) && WinExist("ahk_id " WizardGui.Hwnd)
}

/** human-readable form of an AHK hotkey string, e.g. "^F5" -> "Ctrl+F5" */
KeyLabel(hk) {
    label := ""
    i := 1
    while i <= StrLen(hk) {
        c := SubStr(hk, i, 1)
        if (c = "^")
            label .= "Ctrl+"
        else if (c = "!")
            label .= "Alt+"
        else if (c = "+")
            label .= "Shift+"
        else if (c = "#")
            label .= "Win+"
        else
            break
        i++
    }
    return label . SubStr(hk, i)
}

ApplyKeybinds() {
    global KeyDefs, KeyActions, Keys, RegisteredKeys, WIZARD_ONLY
    for hk in RegisteredKeys
        try Hotkey hk, "Off"
    RegisteredKeys := []
    for def in KeyDefs {
        action := def[1]
        if (WIZARD_ONLY.Has(action) && !WizardActive())
            continue
        try {
            Hotkey Keys[action], KeyActions[action], "On"
            RegisteredKeys.Push(Keys[action])
        } catch {
            ; invalid saved key: fall back to the default so nothing is lost
            Keys[action] := def[2]
            IniWrite def[2], IniFile, "keys", action
            Hotkey def[2], KeyActions[action], "On"
            RegisteredKeys.Push(def[2])
        }
    }
}

ShowKeybindGui(*) {
    global KeyDefs, Keys, IniFile
    static open := 0
    if IsObject(open) {
        open.Show()
        return
    }
    kb := Gui("+AlwaysOnTop", "Voyage Importer - Keybinds")
    kb.SetFont("s10")
    kb.Add("Text", "xm w360", "Click a box and press the new key or combo, then Save."
        . " Leave a box empty to keep its current key.")
    controls := Map()
    for def in KeyDefs {
        kb.Add("Text", "xm w230 h22 +0x200", def[3])
        ctl := kb.Add("Hotkey", "x+8 yp w120")
        ctl.Value := Keys[def[1]]
        controls[def[1]] := ctl
    }
    saveBtn := kb.Add("Button", "xm w120 Default", "Save")
    resetBtn := kb.Add("Button", "x+8 w120", "Reset defaults")

    DoSave(*) {
        pending := Map()
        for def in KeyDefs {
            v := controls[def[1]].Value
            pending[def[1]] := (v = "") ? Keys[def[1]] : v
        }
        ; refuse duplicate assignments - each action needs its own key
        seen := Map()
        for action, hk in pending {
            if seen.Has(hk) {
                MsgBox "Two actions share the key " KeyLabel(hk) ". Give each action its own key."
                return
            }
            seen[hk] := action
        }
        for action, hk in pending {
            Keys[action] := hk
            IniWrite hk, IniFile, "keys", action
        }
        ApplyKeybinds()
        kb.Hide()
        Flash "Keybinds saved and applied.", 2500
    }
    DoReset(*) {
        for def in KeyDefs
            controls[def[1]].Value := def[2]
    }
    saveBtn.OnEvent("Click", DoSave)
    resetBtn.OnEvent("Click", DoReset)
    kb.OnEvent("Close", (*) => (kb.Hide(), true)) ; hide, don't destroy - reopened from the tray
    open := kb
    kb.Show()
}

A_TrayMenu.Insert("1&", "Keybinds...", ShowKeybindGui)
A_TrayMenu.Default := "Keybinds..."
ApplyKeybinds()

; ---------------- FIRST-RUN SETUP WIZARD ----------------
; A small always-on-top overlay that walks new users through calibration.
; It auto-advances when the matching calibration key is pressed. Reachable
; any time from the tray: "Setup wizard...". Auto-opens once on first run.
WizardGui := 0
WizardStepIndex := 1
WizardProgressCtl := 0
WizardTitleCtl := 0
WizardBodyCtl := 0
WizardHintCtl := 0
WizardBackBtn := 0
WizardNextBtn := 0

WizardSteps() {
    global Keys
    return [
        Map("id", "welcome", "wait", "", "title", "Welcome aboard!",
            "body", "This one-time setup teaches the importer where things sit on YOUR screen."
            . " It takes about a minute.`n`nBefore we start:`n"
            . "  - Path of Exile in Windowed or Windowed Fullscreen`n"
            . "  - The Voyage board open, chart panel visible, not scrolled`n"
            . "  - The solver site open in your browser (click the page once)`n`n"
            . "This window stays on top - drag it anywhere out of the way."),
        Map("id", "grid-tl", "wait", "GridTL", "title", "Chart grid - corner 1 of 2",
            "body", "In PoE, hover your mouse over the CENTRE of the TOP-LEFT chart"
            . " in the chart INVENTORY (the small chart squares on the right side"
            . " of the Voyage screen - NOT the big 3x3 board in the middle)."
            . "`n`nThen press " KeyLabel(Keys["WizardSet"]) " (keep the mouse still)."),
        Map("id", "grid-br", "wait", "GridBR", "title", "Chart grid - corner 2 of 2",
            "body", "Now hover the CENTRE of the BOTTOM-RIGHT cell of the chart grid"
            . " - the far corner of the 6-wide grid, even if that slot is empty.`n`n"
            . "Then press " KeyLabel(Keys["WizardSet"]) "."),
        Map("id", "page-tab-1", "wait", "PageTab1", "title", "Chart pages - Page 1 tab",
            "body", "The chart panel now has TWO pages. The sweep clicks between them"
            . " automatically.`n`nHover the PAGE 1 tab button and press "
            . KeyLabel(Keys["WizardSet"]) ".`n`n"
            . "(No page tabs on your panel? Click Skip - the sweep just does one page.)"),
        Map("id", "page-tab-2", "wait", "PageTab2", "title", "Chart pages - Page 2 tab",
            "body", "Now hover the PAGE 2 tab button and press "
            . KeyLabel(Keys["WizardSet"]) "."),
        Map("id", "sweep-skip", "wait", "EmptySkip", "title", "Sweep speed - blank rows",
            "body", "Charts usually pack from the top, so after enough fully blank rows"
            . " the sweep skips the rest of the page instead of waiting on every"
            . " empty slot.`n`nCurrently: skip after " EmptySkipRows " blank row"
            . (EmptySkipRows = 1 ? "" : "s") (EmptySkipRows = 0 ? " (never skip)" : "")
            . ".`n`nPress " KeyLabel(Keys["WizardSet"]) " to change it - set 0 if you"
            . " keep charts parked at the bottom of a page. Or click Skip to keep it."),
        Map("id", "border-exact", "wait", "ExactDone", "title", "Board borders - all 12 points",
            "body", "Now teach it exactly where each of the 12 border modifiers sits.`n`n"
            . "Recording starts automatically.`n`n"
            . "Hover the modifier named below and press " KeyLabel(Keys["WizardSet"]) "."
            . " The script names each of the 12 in turn."),
        Map("id", "preview", "wait", "BorderPreview", "title", "Optional: preview the aim",
            "body", "Press " KeyLabel(Keys["WizardSet"]) " to watch the mouse visit all 12"
            . " border points slowly - no OCR, no clipboard, just a dry run.`n`n"
            . "If a point misses its pill, rerun the wizard from the tray and redo the border step."
            . "`n`nOr just click Skip."),
        Map("id", "done", "wait", "", "title", "You're set!",
            "body", "Daily use:`n"
            . "  - " KeyLabel(Keys["RunSweep"]) "  =  full import (charts + border OCR)`n"
            . "  - " KeyLabel(Keys["BordersOnly"]) "  =  rescan just the 12 borders`n"
            . "  - " KeyLabel(Keys["Abort"]) "  =  abort anything`n`n"
            . "Tray icon -> Keybinds... to rebind any of these.`n"
            . "Tray icon -> Setup wizard... to run this again."),
    ]
}

StartWizard(*) {
    global WizardGui, WizardStepIndex, WizardProgressCtl, WizardTitleCtl
    global WizardBodyCtl, WizardHintCtl, WizardBackBtn, WizardNextBtn
    if IsObject(WizardGui) {
        WizardStepIndex := 1
        WizardRender()
        WizardGui.Show()
        ApplyKeybinds()
        SetTimer WizardUpdateStatus, 800
        return
    }
    WizardGui := Gui("+AlwaysOnTop +ToolWindow", "Voyage Importer - Setup")
    WizardGui.BackColor := "16130E"
    WizardGui.SetFont("s9 c9A8F76", "Segoe UI")
    WizardProgressCtl := WizardGui.Add("Text", "xm w400", "")
    WizardGui.SetFont("s12 cE7D7AB Bold", "Segoe UI")
    WizardTitleCtl := WizardGui.Add("Text", "xm w400", "")
    WizardGui.SetFont("s10 cD8CBB0 Norm", "Segoe UI")
    WizardBodyCtl := WizardGui.Add("Text", "xm w400 h170", "")
    WizardGui.SetFont("s10 c7FD98F", "Segoe UI")
    WizardHintCtl := WizardGui.Add("Text", "xm w400 h48", "")
    WizardGui.SetFont("s10 cD8CBB0", "Segoe UI")
    WizardBackBtn := WizardGui.Add("Button", "xm w90", "Back")
    WizardNextBtn := WizardGui.Add("Button", "x+8 w130 Default", "Next")
    closeBtn := WizardGui.Add("Button", "x+8 w90", "Close")
    WizardBackBtn.OnEvent("Click", (*) => WizardMove(-1))
    WizardNextBtn.OnEvent("Click", (*) => WizardMove(1))
    closeBtn.OnEvent("Click", (*) => WizardFinish(false))
    WizardGui.OnEvent("Close", (*) => (WizardFinish(false), true))
    WizardStepIndex := 1
    WizardRender()
    WizardGui.Show("x24 y24")
    ApplyKeybinds()
    SetTimer WizardUpdateStatus, 800
}

WizardRender() {
    global WizardStepIndex, WizardProgressCtl, WizardTitleCtl, WizardBodyCtl
    global WizardHintCtl, WizardBackBtn, WizardNextBtn, Keys
    steps := WizardSteps()
    if (WizardStepIndex < 1)
        WizardStepIndex := 1
    if (WizardStepIndex > steps.Length)
        WizardStepIndex := steps.Length
    step := steps[WizardStepIndex]
    WizardProgressCtl.Value := "Step " WizardStepIndex " of " steps.Length
    WizardTitleCtl.Value := step["title"]
    WizardBodyCtl.Value := step["body"]
    if (step["id"] = "border-exact")
        WizardHintCtl.Value := WizardExactHint()
    else if (step["wait"] != "")
        WizardHintCtl.Value := "-> Waiting for " KeyLabel(Keys["WizardSet"]) " ... (auto-advances, or click Skip)"
    else if (step["id"] = "welcome")
        WizardUpdateStatus()
    else
        WizardHintCtl.Value := "Have a profitable voyage!"
    WizardBackBtn.Enabled := WizardStepIndex > 1
    WizardNextBtn.Text := (WizardStepIndex = steps.Length) ? "Finish"
        : (step["wait"] != "") ? "Skip" : "Next"
}

WizardUpdateStatus() {
    global WizardGui, WizardStepIndex, WizardHintCtl, PoeWinTitle, BrowserWinTitle
    if !IsObject(WizardGui) || !WinExist("ahk_id " WizardGui.Hwnd)
        return
    steps := WizardSteps()
    if (steps[WizardStepIndex]["id"] != "welcome")
        return
    poe := WinExist(PoeWinTitle) ? "OK - found" : "MISSING - start PoE (windowed)"
    web := WinExist(BrowserWinTitle) ? "OK - found" : "MISSING - open the solver site"
    WizardHintCtl.Value := "Path of Exile window:  " poe "`nSolver browser tab:     " web
}

WizardMove(delta) {
    global WizardStepIndex, ExactBorderNext
    steps := WizardSteps()
    if (delta > 0 && WizardStepIndex >= steps.Length) {
        WizardFinish(true)
        return
    }
    WizardStepIndex += delta
    if (WizardStepIndex < 1)
        WizardStepIndex := 1
    if (WizardStepIndex > steps.Length)
        WizardStepIndex := steps.Length
    ; entering the border step starts the 12-point recording automatically
    if (steps[WizardStepIndex]["id"] = "border-exact") {
        ClearExactBorderCalibration()
        ExactBorderNext := 1
    }
    WizardRender()
}

WizardExactHint() {
    global ExactBorderNext, ExactBorderPoints, Keys
    if (ExactBorderNext < 1)
        return "-> Hover the first modifier and press " KeyLabel(Keys["WizardSet"]) " to begin"
    return "Saved " ExactBorderPoints.Length "/12 - next: " BorderPointLabel(ExactBorderNext)
        . "`nHover it and press " KeyLabel(Keys["WizardSet"]) "."
}

; one key does every wizard "set": what it sets depends on the current step
WizardSetPressed(*) {
    global WizardStepIndex
    if !WizardActive()
        return
    steps := WizardSteps()
    if (WizardStepIndex < 1 || WizardStepIndex > steps.Length)
        return
    id := steps[WizardStepIndex]["id"]
    if (id = "grid-tl")
        SetGridTopLeft()
    else if (id = "grid-br")
        SetGridBottomRight()
    else if (id = "page-tab-1")
        SetPageTab(1)
    else if (id = "page-tab-2")
        SetPageTab(2)
    else if (id = "sweep-skip")
        PromptEmptySkip()
    else if (id = "border-exact")
        SaveExactPoint()
    else if (id = "preview")
        PreviewBorders()
    else
        Flash "Nothing to set on this step - use the buttons.", 2000
}

WizardOnAction(action) {
    global WizardGui, WizardStepIndex
    if !IsObject(WizardGui) || !WinExist("ahk_id " WizardGui.Hwnd)
        return
    steps := WizardSteps()
    if (WizardStepIndex < 1 || WizardStepIndex > steps.Length)
        return
    step := steps[WizardStepIndex]
    if (step["wait"] = action) {
        WizardMove(1)
        return
    }
    ; progress ticks inside the 12-point step refresh the hint, not the step
    if (step["id"] = "border-exact" && (action = "ExactStart" || action = "ExactSave"))
        WizardRender()
    ; finishing the quick 2-corner mode also satisfies the border step
    if (step["id"] = "border-exact" && action = "BorderBR" && BoardCalibrated())
        WizardMove(1)
}

WizardFinish(completed) {
    global WizardGui, IniFile, Keys
    SetTimer WizardUpdateStatus, 0
    if IsObject(WizardGui)
        WizardGui.Hide()
    ApplyKeybinds()
    IniWrite 1, IniFile, "wizard", "Seen"
    if completed
        Flash "Setup complete. " KeyLabel(Keys["RunSweep"]) " runs the import!", 4000
}

; ---------------- DIAGNOSTIC BUNDLE ----------------
; One click -> a zip on the desktop the player can drag straight into a
; GitHub issue: version + system info, the calibration ini, the activity
; log, the last OCR / chart text, and - only after an explicit yes - the
; last scan screenshots (they show the PoE window, so they're opt-in).
SaveDiagnostics(*) {
    global ScriptVersion, IniFile, LogFile, TempDir, PoeWinTitle, CaptureMode
    ts := FormatTime(, "yyyyMMdd-HHmmss")
    dir := TempDir "\voyage-diag-bundle-" ts
    try DirCreate dir
    info := "Allflame Voyage importer - diagnostic bundle`n"
        . "generated: " FormatTime(, "yyyy-MM-dd HH:mm:ss") "`n"
        . "script version: " ScriptVersion "`n"
        . "AutoHotkey: " A_AhkVersion "`n"
        . "Windows: " A_OSVersion (A_Is64bitOS ? " 64-bit" : "") "`n"
        . "primary screen: " A_ScreenWidth "x" A_ScreenHeight " @ " A_ScreenDPI " DPI`n"
        . "monitors: " MonitorGetCount() "`n"
        . "running as admin: " (A_IsAdmin ? "yes" : "no") "`n"
    if WinExist(PoeWinTitle) {
        WinGetPos &px, &py, &pw, &ph, PoeWinTitle
        info .= "PoE window: " pw "x" ph " at " px "," py "`n"
    } else {
        info .= "PoE window: not found`n"
    }
    info .= "grid calibrated: " (Calibrated() ? "yes" : "no") "`n"
        . "board calibrated: " (BoardCalibrated() ? "yes" : "no") "`n"
        . "page tabs calibrated: " (PagesCalibrated() ? "yes" : "no") "`n"
        . "capture mode: " CaptureMode "`n"
    try FileAppend info, dir "\info.txt", "UTF-8"
    try FileCopy IniFile, dir "\voyage-import.ini"
    try FileCopy LogFile, dir "\voyage-import.log"
    try FileCopy TempDir "\voyage-diag-borders.txt", dir "\last-border-ocr.txt"
    try FileCopy TempDir "\voyage-diag-charts.txt", dir "\last-chart-sweep.txt"
    shots := MsgBox("Include the last scan screenshots?`n`nThey're the most useful part for OCR"
        . " problems, but they show your Path of Exile window (character name and so on)."
        . " Choose No to leave them out.", "Diagnostic bundle", "YesNo")
    if (shots = "Yes") {
        try FileCopy TempDir "\voyage-diag-alt.png", dir "\last-alt-capture.png"
        try FileCopy TempDir "\voyage-diag-alt-prep.png", dir "\last-alt-prepared.png"
        Loop 12
            try FileCopy TempDir "\voyage-diag-border-" (A_Index - 1) ".png", dir "\last-border-" (A_Index - 1) ".png"
    }
    zip := A_Desktop "\voyage-import-diagnostics-" ts ".zip"
    try FileDelete zip
    psCmd := "Compress-Archive -Path '" dir "\*' -DestinationPath '" zip "' -Force"
    RunWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "' psCmd '"', , "Hide"
    if FileExist(zip) {
        try DirDelete dir, 1
        Log("diagnostic bundle saved " (shots = "Yes" ? "(with screenshots)" : "(no screenshots)"))
        MsgBox "Saved to your desktop:`n`n" zip "`n`nDrag the zip file into your GitHub issue:`n"
            . "https://github.com/one-more-map/one-more-map.github.io/issues", "Diagnostic bundle"
        Run 'explorer.exe /select,"' zip '"'
    } else {
        MsgBox "Couldn't create the zip - the gathered files are in:`n`n" dir, "Diagnostic bundle"
    }
}

A_TrayMenu.Insert("2&", "Setup wizard...", StartWizard)
A_TrayMenu.Insert("3&", "Save diagnostic bundle...", SaveDiagnostics)
; the wizard must be seen once - even with calibration already in the ini.
; Completing it OR closing/skipping it sets the Seen flag; after that it only
; opens from the tray menu.
if (IniRead(IniFile, "wizard", "Seen", "0") = "0")
    SetTimer StartWizard, -600
; ------------------------------------------

Flash(text, ms := 1400) {
    ToolTip text
    SetTimer () => ToolTip(), -ms
}

CellPos(row, col) {
    global TLx, TLy, BRx, BRy, GridCols, GridRows
    dx := (GridCols > 1) ? (BRx - TLx) / (GridCols - 1) : 0
    dy := (GridRows > 1) ? (BRy - TLy) / (GridRows - 1) : 0
    return [Round(TLx + col * dx), Round(TLy + row * dy)]
}

Calibrated() => (TLx != 0 && TLy != 0 && BRx != 0 && BRy != 0)

IsChartText(text) {
    return InStr(text, "Item Class: Chart")
        || InStr(text, "아이템 종류: 해도")
        || (InStr(text, "物品类别") && InStr(text, "海图"))
        || ((InStr(text, "物品類別") || InStr(text, "物品種類")) && (InStr(text, "海圖") || InStr(text, "海图")))
}

ExactBordersCalibrated() {
    global ExactBorderPoints
    return ExactBorderPoints.Length = 12
}

BoardCalibrated() {
    global BorderTLx, BorderTLy, BorderBRx, BorderBRy
    return ExactBordersCalibrated()
        || (BorderTLx != 0 && BorderTLy != 0 && BorderBRx > BorderTLx && BorderBRy > BorderTLy)
}

BorderPointLabel(index) {
    labels := [
        "TOP - left", "TOP - middle", "TOP - right",
        "RIGHT - top", "RIGHT - middle", "RIGHT - bottom",
        "BOTTOM - left", "BOTTOM - middle", "BOTTOM - right",
        "LEFT - top", "LEFT - middle", "LEFT - bottom"
    ]
    return (index >= 1 && index <= labels.Length) ? labels[index] : "unknown"
}

ClearExactBorderCalibration() {
    global ExactBorderPoints, ExactBorderNext, IniFile
    ExactBorderPoints := []
    ExactBorderNext := 0
    try IniDelete IniFile, "board-exact"
}

BorderPoints() {
    global BorderTLx, BorderTLy, BorderBRx, BorderBRy, ExactBorderPoints
    if ExactBordersCalibrated()
        return ExactBorderPoints

    ; The quick calibration defines the outer rectangle. Each modifier sits at the centre
    ; of one of the three equal edge segments, never outside that rectangle.
    cellW := (BorderBRx - BorderTLx) / 3
    cellH := (BorderBRy - BorderTLy) / 3
    points := []

    ; indices 0-2: top, left to right
    Loop 3
        points.Push([Round(BorderTLx + (A_Index - 0.5) * cellW), BorderTLy])
    ; indices 3-5: right, top to bottom
    Loop 3
        points.Push([BorderBRx, Round(BorderTLy + (A_Index - 0.5) * cellH)])
    ; indices 6-8: bottom, left to right
    Loop 3
        points.Push([Round(BorderTLx + (A_Index - 0.5) * cellW), BorderBRy])
    ; indices 9-11: left, top to bottom
    Loop 3
        points.Push([BorderTLx, Round(BorderTLy + (A_Index - 0.5) * cellH)])

    return points
}

OcrPowerShell() {
    return "
(
param(
    [int]$Index = -1,
    [int]$WindowLeft = 0,
    [int]$WindowTop = 0,
    [int]$WindowWidth = 0,
    [int]$WindowHeight = 0,
    [string]$ImagePath = '',
    [string]$Session = '',
    [string]$PreferredLanguage = '',
    [string]$CaptureMode = 'auto',
    [Parameter(Mandatory = $true)][string]$OutputPath)

$ErrorActionPreference = 'Stop'
trap {
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText(
        $OutputPath,
        ('OCR HELPER ERROR: ' + $_.Exception.ToString()),
        $utf8)
    exit 1
}
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Runtime.WindowsRuntime

Add-Type -ReferencedAssemblies 'System.Drawing' -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class VoyageOcrImage
{
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern uint GetLongPathNameW(string shortPath, System.Text.StringBuilder buffer, uint bufferLength);

    // %TEMP% can arrive as an 8.3 short path (C:\Users\HARDPC~1\...). Win32
    // tolerates those, but WinRT StorageFile - which Windows OCR uses to open
    // images - can refuse them ('An object at the specified path does not
    // exist'), failing the scan on every image it just wrote (issues #27/#35).
    public static string LongPath(string path)
    {
        try
        {
            System.Text.StringBuilder buffer = new System.Text.StringBuilder(1024);
            uint length = GetLongPathNameW(path, buffer, 1024);
            if (length > 0 && length < 1024) { return buffer.ToString(); }
        }
        catch { }
        return path;
    }

    public static void Prepare(string sourcePath, string outputPath)
    {
        using (var original = new Bitmap(sourcePath))
        using (var source = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(source))
            {
                graphics.DrawImageUnscaled(original, 0, 0);
            }

            var rect = new Rectangle(0, 0, source.Width, source.Height);
            var sourceData = source.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            var sourceStride = Math.Abs(sourceData.Stride);
            var sourceBytes = new byte[sourceStride * source.Height];
            Marshal.Copy(sourceData.Scan0, sourceBytes, 0, sourceBytes.Length);
            source.UnlockBits(sourceData);

            using (var mask = new Bitmap(source.Width, source.Height, PixelFormat.Format24bppRgb))
            {
                var maskData = mask.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format24bppRgb);
                var maskStride = Math.Abs(maskData.Stride);
                var maskBytes = new byte[maskStride * mask.Height];
                for (var i = 0; i < maskBytes.Length; i++)
                {
                    maskBytes[i] = 255;
                }

                for (var y = 0; y < source.Height; y++)
                {
                    for (var x = 0; x < source.Width; x++)
                    {
                        var sourceOffset = y * sourceStride + x * 4;
                        var blue = sourceBytes[sourceOffset];
                        var green = sourceBytes[sourceOffset + 1];
                        var red = sourceBytes[sourceOffset + 2];

                        // PoE board modifiers use lavender text. Keep its
                        // anti-aliased pixels and discard inventory levels,
                        // icons, scenery and other white UI text.
                        var isModifierText =
                            blue >= 130 &&
                            blue - red >= 30 &&
                            blue - green >= 30 &&
                            Math.Abs(red - green) <= 18;
                        if (!isModifierText)
                        {
                            continue;
                        }

                        var maskOffset = y * maskStride + x * 3;
                        maskBytes[maskOffset] = 0;
                        maskBytes[maskOffset + 1] = 0;
                        maskBytes[maskOffset + 2] = 0;
                    }
                }

                Marshal.Copy(maskBytes, 0, maskData.Scan0, maskBytes.Length);
                mask.UnlockBits(maskData);

                var scale = Math.Min(2.0, 6000.0 / Math.Max(mask.Width, mask.Height));
                var scaledWidth = (int)Math.Round(mask.Width * scale);
                var scaledHeight = (int)Math.Round(mask.Height * scale);
                const int padding = 64;
                using (var prepared = new Bitmap(
                    scaledWidth + 2 * padding,
                    scaledHeight + 2 * padding,
                    PixelFormat.Format24bppRgb))
                {
                    using (var graphics = Graphics.FromImage(prepared))
                    {
                        graphics.Clear(Color.White);
                        graphics.InterpolationMode = InterpolationMode.NearestNeighbor;
                        graphics.PixelOffsetMode = PixelOffsetMode.Half;
                        graphics.DrawImage(
                            mask,
                            new Rectangle(padding, padding, scaledWidth, scaledHeight));
                    }
                    prepared.Save(outputPath, ImageFormat.Png);
                }
            }
        }
    }

    // HDR desktops make GDI captures washed-out and low-contrast (issue #33):
    // colours shift enough to defeat the lavender mask, and the raw image is
    // too flat for OCR. Stretch the 2nd..98th percentile luminance range to
    // full contrast as a last-chance pass; same scale/padding as Prepare so
    // word geometry maps back identically.
    public static void Normalize(string sourcePath, string outputPath)
    {
        using (var original = new Bitmap(sourcePath))
        using (var source = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(source))
            {
                graphics.DrawImageUnscaled(original, 0, 0);
            }

            var rect = new Rectangle(0, 0, source.Width, source.Height);
            var sourceData = source.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            var sourceStride = Math.Abs(sourceData.Stride);
            var sourceBytes = new byte[sourceStride * source.Height];
            Marshal.Copy(sourceData.Scan0, sourceBytes, 0, sourceBytes.Length);
            source.UnlockBits(sourceData);

            var histogram = new int[256];
            var lums = new byte[source.Width * source.Height];
            var index = 0;
            for (var y = 0; y < source.Height; y++)
            {
                for (var x = 0; x < source.Width; x++)
                {
                    var offset = y * sourceStride + x * 4;
                    var lum = (byte)((sourceBytes[offset] * 114 +
                        sourceBytes[offset + 1] * 587 +
                        sourceBytes[offset + 2] * 299) / 1000);
                    lums[index++] = lum;
                    histogram[lum]++;
                }
            }
            var total = source.Width * source.Height;
            var lowTarget = total / 50;
            var highTarget = total - total / 50;
            var low = 0;
            var high = 255;
            var cumulative = 0;
            for (var i = 0; i < 256; i++)
            {
                cumulative += histogram[i];
                if (cumulative <= lowTarget) { low = i; }
                if (cumulative < highTarget) { high = i; }
            }
            if (high <= low) { high = low + 1; }

            using (var mask = new Bitmap(source.Width, source.Height, PixelFormat.Format24bppRgb))
            {
                var maskData = mask.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format24bppRgb);
                var maskStride = Math.Abs(maskData.Stride);
                var maskBytes = new byte[maskStride * mask.Height];
                index = 0;
                for (var y = 0; y < source.Height; y++)
                {
                    for (var x = 0; x < source.Width; x++)
                    {
                        var stretched = (lums[index++] - low) * 255 / (high - low);
                        if (stretched < 0) { stretched = 0; }
                        if (stretched > 255) { stretched = 255; }
                        var value = (byte)stretched;
                        var maskOffset = y * maskStride + x * 3;
                        maskBytes[maskOffset] = value;
                        maskBytes[maskOffset + 1] = value;
                        maskBytes[maskOffset + 2] = value;
                    }
                }
                Marshal.Copy(maskBytes, 0, maskData.Scan0, maskBytes.Length);
                mask.UnlockBits(maskData);

                var scale = Math.Min(2.0, 6000.0 / Math.Max(mask.Width, mask.Height));
                var scaledWidth = (int)Math.Round(mask.Width * scale);
                var scaledHeight = (int)Math.Round(mask.Height * scale);
                const int padding = 64;
                using (var prepared = new Bitmap(
                    scaledWidth + 2 * padding,
                    scaledHeight + 2 * padding,
                    PixelFormat.Format24bppRgb))
                {
                    using (var graphics = Graphics.FromImage(prepared))
                    {
                        graphics.Clear(Color.White);
                        graphics.InterpolationMode = InterpolationMode.NearestNeighbor;
                        graphics.PixelOffsetMode = PixelOffsetMode.Half;
                        graphics.DrawImage(
                            mask,
                            new Rectangle(padding, padding, scaledWidth, scaledHeight));
                    }
                    prepared.Save(outputPath, ImageFormat.Png);
                }
            }
        }
    }
}

// Windows.Graphics.Capture at the raw WinRT ABI level (issue #33). GDI's
// CopyFromScreen returns washed-out, non-tone-mapped pixels when Windows
// HDR is on; WGC can read the real float16 scRGB frame and tone-map it
// against the monitor's SDR white level. Every WinRT instance call goes
// through vtable delegates because .NET wraps WinRT objects in projected
// RCWs that refuse ComImport casts (field-tested: RCW casts throw
// InvalidCastException, delegates are pixel-identical to GDI on SDR).
public static class VoyageWgc
{
    [DllImport("d3d11.dll")]
    private static extern int D3D11CreateDevice(IntPtr adapter, int driverType, IntPtr software, int flags, IntPtr featureLevels, int featureLevelCount, int sdkVersion, out IntPtr device, out int featureLevel, out IntPtr context);

    [DllImport("d3d11.dll")]
    private static extern int CreateDirect3D11DeviceFromDXGIDevice(IntPtr dxgiDevice, out IntPtr graphicsDevice);

    [DllImport("combase.dll")]
    private static extern int WindowsCreateString([MarshalAs(UnmanagedType.LPWStr)] string src, int length, out IntPtr hstring);

    [DllImport("combase.dll")]
    private static extern int WindowsDeleteString(IntPtr hstring);

    [DllImport("combase.dll")]
    private static extern int RoGetActivationFactory(IntPtr activatableClassId, ref Guid iid, out IntPtr factory);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

    [StructLayout(LayoutKind.Sequential)]
    public struct SizeInt32 { public int Width; public int Height; }

    [StructLayout(LayoutKind.Sequential)]
    private struct D3D11_TEXTURE2D_DESC
    {
        public uint Width;
        public uint Height;
        public uint MipLevels;
        public uint ArraySize;
        public int Format;
        public uint SampleCount;
        public uint SampleQuality;
        public int Usage;
        public uint BindFlags;
        public uint CPUAccessFlags;
        public uint MiscFlags;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct D3D11_BOX
    {
        public uint Left;
        public uint Top;
        public uint Front;
        public uint Right;
        public uint Bottom;
        public uint Back;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct D3D11_MAPPED_SUBRESOURCE
    {
        public IntPtr Data;
        public uint RowPitch;
        public uint DepthPitch;
    }

    [ComImport]
    [Guid("3628E81B-3CAC-4C60-B7F4-23CE0E0C3356")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IGraphicsCaptureItemInterop
    {
        IntPtr CreateForWindow([In] IntPtr window, [In] ref Guid iid);
        IntPtr CreateForMonitor([In] IntPtr monitor, [In] ref Guid iid);
    }

    // Plain COM (non-WinRT) objects still take ComImport casts fine.
    [ComImport]
    [Guid("DB6F6DDB-AC77-4E88-8253-819DF9BBF140")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface ID3D11DeviceAbi
    {
        [PreserveSig] void Slot3_CreateBuffer();
        [PreserveSig] void Slot4_CreateTexture1D();
        [PreserveSig] int CreateTexture2D(ref D3D11_TEXTURE2D_DESC desc, IntPtr initialData, out IntPtr texture);
    }

    [ComImport]
    [Guid("C0BFA96C-E089-44FB-8EAF-26F8796190DA")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface ID3D11DeviceContextAbi
    {
        [PreserveSig] void Slot3();
        [PreserveSig] void Slot4();
        [PreserveSig] void Slot5();
        [PreserveSig] void Slot6();
        [PreserveSig] void Slot7();
        [PreserveSig] void Slot8();
        [PreserveSig] void Slot9();
        [PreserveSig] void Slot10();
        [PreserveSig] void Slot11();
        [PreserveSig] void Slot12();
        [PreserveSig] void Slot13();
        [PreserveSig] int Map(IntPtr resource, uint subresource, int mapType, uint flags, out D3D11_MAPPED_SUBRESOURCE mapped);
        [PreserveSig] void Unmap(IntPtr resource, uint subresource);
        [PreserveSig] void Slot16();
        [PreserveSig] void Slot17();
        [PreserveSig] void Slot18();
        [PreserveSig] void Slot19();
        [PreserveSig] void Slot20();
        [PreserveSig] void Slot21();
        [PreserveSig] void Slot22();
        [PreserveSig] void Slot23();
        [PreserveSig] void Slot24();
        [PreserveSig] void Slot25();
        [PreserveSig] void Slot26();
        [PreserveSig] void Slot27();
        [PreserveSig] void Slot28();
        [PreserveSig] void Slot29();
        [PreserveSig] void Slot30();
        [PreserveSig] void Slot31();
        [PreserveSig] void Slot32();
        [PreserveSig] void Slot33();
        [PreserveSig] void Slot34();
        [PreserveSig] void Slot35();
        [PreserveSig] void Slot36();
        [PreserveSig] void Slot37();
        [PreserveSig] void Slot38();
        [PreserveSig] void Slot39();
        [PreserveSig] void Slot40();
        [PreserveSig] void Slot41();
        [PreserveSig] void Slot42();
        [PreserveSig] void Slot43();
        [PreserveSig] void Slot44();
        [PreserveSig] void Slot45();
        [PreserveSig] void CopySubresourceRegion(IntPtr dst, uint dstSubresource, uint dstX, uint dstY, uint dstZ, IntPtr src, uint srcSubresource, ref D3D11_BOX box);
    }

    // Raw vtable delegates for WinRT instance calls (IUnknown slots 0-2,
    // IInspectable slots 3-5, interface methods from slot 6).
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int FnThisOnly(IntPtr thisPtr);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int FnOutPtr(IntPtr thisPtr, out IntPtr result);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int FnOutSize(IntPtr thisPtr, out SizeInt32 result);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int FnPutByte(IntPtr thisPtr, byte value);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int FnPtrOutPtr(IntPtr thisPtr, IntPtr arg, out IntPtr result);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int FnCreateFreeThreaded(IntPtr thisPtr, IntPtr device, int pixelFormat, int numberOfBuffers, SizeInt32 size, out IntPtr result);
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    private delegate int FnGetInterface(IntPtr thisPtr, ref Guid iid, out IntPtr result);

    private static Delegate VtableFn(IntPtr obj, int slot, Type delegateType)
    {
        IntPtr vtable = Marshal.ReadIntPtr(obj);
        IntPtr fn = Marshal.ReadIntPtr(vtable, slot * IntPtr.Size);
        return Marshal.GetDelegateForFunctionPointer(fn, delegateType);
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct MONITORINFOEX
    {
        public int Size;
        public RECT Monitor;
        public RECT Work;
        public uint Flags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string Device;
    }

    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromRect(ref RECT rect, uint flags);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern bool GetMonitorInfoW(IntPtr hmon, ref MONITORINFOEX info);

    [StructLayout(LayoutKind.Sequential)]
    private struct LUID { public uint LowPart; public int HighPart; }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_PATH_SOURCE_INFO { public LUID AdapterId; public uint Id; public uint ModeInfoIdx; public uint StatusFlags; }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_PATH_TARGET_INFO
    {
        public LUID AdapterId;
        public uint Id;
        public uint ModeInfoIdx;
        public uint OutputTechnology;
        public uint Rotation;
        public uint Scaling;
        public uint RefreshRateNumerator;
        public uint RefreshRateDenominator;
        public uint ScanLineOrdering;
        public int TargetAvailable;
        public uint StatusFlags;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_PATH_INFO { public DISPLAYCONFIG_PATH_SOURCE_INFO Source; public DISPLAYCONFIG_PATH_TARGET_INFO Target; public uint Flags; }

    [StructLayout(LayoutKind.Sequential, Size = 64)]
    private struct DISPLAYCONFIG_MODE_INFO { public uint InfoType; public uint Id; public LUID AdapterId; }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_DEVICE_INFO_HEADER { public uint Type; public uint Size; public LUID AdapterId; public uint Id; }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct DISPLAYCONFIG_SOURCE_DEVICE_NAME
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER Header;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string ViewGdiDeviceName;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER Header;
        public uint Value;
        public uint ColorEncoding;
        public uint BitsPerColorChannel;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct DISPLAYCONFIG_SDR_WHITE_LEVEL
    {
        public DISPLAYCONFIG_DEVICE_INFO_HEADER Header;
        public uint SDRWhiteLevel;
    }

    [DllImport("user32.dll")]
    private static extern int GetDisplayConfigBufferSizes(uint flags, out uint numPaths, out uint numModes);

    [DllImport("user32.dll")]
    private static extern int QueryDisplayConfig(uint flags, ref uint numPaths, [In, Out] DISPLAYCONFIG_PATH_INFO[] paths, ref uint numModes, [In, Out] DISPLAYCONFIG_MODE_INFO[] modes, IntPtr currentTopology);

    [DllImport("user32.dll", EntryPoint = "DisplayConfigGetDeviceInfo")]
    private static extern int DisplayConfigGetSourceName(ref DISPLAYCONFIG_SOURCE_DEVICE_NAME request);

    [DllImport("user32.dll", EntryPoint = "DisplayConfigGetDeviceInfo")]
    private static extern int DisplayConfigGetColorInfo(ref DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO request);

    [DllImport("user32.dll", EntryPoint = "DisplayConfigGetDeviceInfo")]
    private static extern int DisplayConfigGetSdrWhiteLevel(ref DISPLAYCONFIG_SDR_WHITE_LEVEL request);

    public static IntPtr MonitorForRegion(int left, int top, int width, int height)
    {
        RECT r;
        r.Left = left; r.Top = top; r.Right = left + width; r.Bottom = top + height;
        return MonitorFromRect(ref r, 2);
    }

    private static bool FindDisplayPath(IntPtr hmon, out DISPLAYCONFIG_PATH_INFO found)
    {
        found = new DISPLAYCONFIG_PATH_INFO();
        MONITORINFOEX info = new MONITORINFOEX();
        info.Size = Marshal.SizeOf(typeof(MONITORINFOEX));
        if (!GetMonitorInfoW(hmon, ref info)) { return false; }
        uint numPaths;
        uint numModes;
        if (GetDisplayConfigBufferSizes(2, out numPaths, out numModes) != 0) { return false; }
        DISPLAYCONFIG_PATH_INFO[] paths = new DISPLAYCONFIG_PATH_INFO[numPaths];
        DISPLAYCONFIG_MODE_INFO[] modes = new DISPLAYCONFIG_MODE_INFO[numModes];
        if (QueryDisplayConfig(2, ref numPaths, paths, ref numModes, modes, IntPtr.Zero) != 0) { return false; }
        for (int i = 0; i < numPaths; i++)
        {
            DISPLAYCONFIG_SOURCE_DEVICE_NAME sourceName = new DISPLAYCONFIG_SOURCE_DEVICE_NAME();
            sourceName.Header.Type = 1;
            sourceName.Header.Size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_SOURCE_DEVICE_NAME));
            sourceName.Header.AdapterId = paths[i].Source.AdapterId;
            sourceName.Header.Id = paths[i].Source.Id;
            if (DisplayConfigGetSourceName(ref sourceName) != 0) { continue; }
            if (!string.Equals(sourceName.ViewGdiDeviceName, info.Device, StringComparison.OrdinalIgnoreCase)) { continue; }
            found = paths[i];
            return true;
        }
        return false;
    }

    // True when Windows "advanced color" (HDR) is active on the monitor -
    // the case where GDI captures come back washed-out (issue #33).
    public static bool IsHdrEnabled(IntPtr hmon)
    {
        try
        {
            DISPLAYCONFIG_PATH_INFO path;
            if (!FindDisplayPath(hmon, out path)) { return false; }
            DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO color = new DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO();
            color.Header.Type = 9;
            color.Header.Size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_GET_ADVANCED_COLOR_INFO));
            color.Header.AdapterId = path.Target.AdapterId;
            color.Header.Id = path.Target.Id;
            if (DisplayConfigGetColorInfo(ref color) != 0) { return false; }
            return (color.Value & 2) != 0;
        }
        catch { return false; }
    }

    // The monitor's SDR white level in scRGB units (1.0 = 80 nits). SDR
    // content on an HDR desktop renders at this brightness; dividing by it
    // during tone mapping puts SDR white back at exactly 255.
    public static double SdrWhiteScale(IntPtr hmon)
    {
        try
        {
            DISPLAYCONFIG_PATH_INFO path;
            if (!FindDisplayPath(hmon, out path)) { return 1.0; }
            DISPLAYCONFIG_SDR_WHITE_LEVEL white = new DISPLAYCONFIG_SDR_WHITE_LEVEL();
            white.Header.Type = 11;
            white.Header.Size = (uint)Marshal.SizeOf(typeof(DISPLAYCONFIG_SDR_WHITE_LEVEL));
            white.Header.AdapterId = path.Target.AdapterId;
            white.Header.Id = path.Target.Id;
            if (DisplayConfigGetSdrWhiteLevel(ref white) != 0) { return 1.0; }
            if (white.SDRWhiteLevel < 1000) { return 1.0; }
            return white.SDRWhiteLevel / 1000.0;
        }
        catch { return 1.0; }
    }

    private static float HalfToFloat(ushort half)
    {
        int sign = (half >> 15) & 1;
        int exponent = (half >> 10) & 0x1F;
        int mantissa = half & 0x3FF;
        float value;
        if (exponent == 0)
        {
            value = (float)(mantissa * Math.Pow(2, -24));
        }
        else if (exponent == 31)
        {
            value = mantissa == 0 ? float.PositiveInfinity : float.NaN;
        }
        else
        {
            value = (float)((1.0 + mantissa / 1024.0) * Math.Pow(2, exponent - 15));
        }
        return sign == 1 ? -value : value;
    }

    private static byte LinearToSrgbByte(double v)
    {
        if (double.IsNaN(v) || v <= 0.0) { return 0; }
        if (v >= 1.0) { return 255; }
        double s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.Pow(v, 1.0 / 2.4) - 0.055;
        int b = (int)Math.Round(s * 255.0);
        if (b < 0) { b = 0; }
        if (b > 255) { b = 255; }
        return (byte)b;
    }

    private static void CheckHr(int hr, string what)
    {
        if (hr < 0) { throw new Exception(what + " failed: 0x" + hr.ToString("X8")); }
    }

    private static void SafeClose(IntPtr winrtObject)
    {
        if (winrtObject == IntPtr.Zero) { return; }
        try
        {
            Guid closableIid = new Guid("30D5A829-7FA4-4026-83BB-D75BAE4EA99E");
            IntPtr closable;
            if (Marshal.QueryInterface(winrtObject, ref closableIid, out closable) == 0)
            {
                FnThisOnly close = (FnThisOnly)VtableFn(closable, 6, typeof(FnThisOnly));
                close(closable);
                Marshal.Release(closable);
            }
        }
        catch { }
    }

    // Capture a screen region through Windows.Graphics.Capture. On HDR
    // monitors the frame is read as float16 scRGB and tone-mapped against
    // the SDR white level, which is exactly what GDI's CopyFromScreen fails
    // to do (issue #33). Writes a PNG to outputPath.
    public static void CaptureRegion(int left, int top, int width, int height, string outputPath, bool forceHdrPath)
    {
        IntPtr hmon = MonitorForRegion(left, top, width, height);
        MONITORINFOEX monInfo = new MONITORINFOEX();
        monInfo.Size = Marshal.SizeOf(typeof(MONITORINFOEX));
        if (!GetMonitorInfoW(hmon, ref monInfo)) { throw new Exception("GetMonitorInfo failed"); }
        int cropX = left - monInfo.Monitor.Left;
        int cropY = top - monInfo.Monitor.Top;
        bool hdr = forceHdrPath || IsHdrEnabled(hmon);
        int pixelFormat = hdr ? 10 : 87; // R16G16B16A16Float : B8G8R8A8UIntNormalized
        int bytesPerPixel = hdr ? 8 : 4;

        IntPtr device = IntPtr.Zero;
        IntPtr context = IntPtr.Zero;
        IntPtr dxgi = IntPtr.Zero;
        IntPtr inspectableDevice = IntPtr.Zero;
        IntPtr itemPtr = IntPtr.Zero;
        IntPtr poolPtr = IntPtr.Zero;
        IntPtr sessionPtr = IntPtr.Zero;
        IntPtr framePtr = IntPtr.Zero;
        IntPtr surfacePtr = IntPtr.Zero;
        IntPtr accessPtr = IntPtr.Zero;
        IntPtr texturePtr = IntPtr.Zero;
        IntPtr stagingPtr = IntPtr.Zero;
        IntPtr classId = IntPtr.Zero;
        try
        {
            int featureLevel;
            int hr = D3D11CreateDevice(IntPtr.Zero, 1, IntPtr.Zero, 0x20, IntPtr.Zero, 0, 7, out device, out featureLevel, out context);
            if (hr < 0)
            {
                hr = D3D11CreateDevice(IntPtr.Zero, 5, IntPtr.Zero, 0x20, IntPtr.Zero, 0, 7, out device, out featureLevel, out context);
            }
            CheckHr(hr, "D3D11CreateDevice");
            Guid dxgiIid = new Guid("54ec77fa-1377-44e6-8c32-88fd5f44c84c");
            CheckHr(Marshal.QueryInterface(device, ref dxgiIid, out dxgi), "QI IDXGIDevice");
            CheckHr(CreateDirect3D11DeviceFromDXGIDevice(dxgi, out inspectableDevice), "CreateDirect3D11DeviceFromDXGIDevice");

            string className = "Windows.Graphics.Capture.GraphicsCaptureItem";
            CheckHr(WindowsCreateString(className, className.Length, out classId), "WindowsCreateString");
            Guid interopIid = new Guid("3628E81B-3CAC-4C60-B7F4-23CE0E0C3356");
            IntPtr factoryPtr;
            CheckHr(RoGetActivationFactory(classId, ref interopIid, out factoryPtr), "RoGetActivationFactory(item)");
            IGraphicsCaptureItemInterop interop = (IGraphicsCaptureItemInterop)Marshal.GetObjectForIUnknown(factoryPtr);
            Marshal.Release(factoryPtr);
            Guid itemIid = new Guid("79C3F95B-31F7-4EC2-A464-632EF5D30760");
            itemPtr = interop.CreateForMonitor(hmon, ref itemIid);
            Marshal.ReleaseComObject(interop);
            SizeInt32 itemSize;
            FnOutSize getSize = (FnOutSize)VtableFn(itemPtr, 7, typeof(FnOutSize));
            CheckHr(getSize(itemPtr, out itemSize), "GraphicsCaptureItem.Size");
            WindowsDeleteString(classId);
            classId = IntPtr.Zero;

            string poolClass = "Windows.Graphics.Capture.Direct3D11CaptureFramePool";
            CheckHr(WindowsCreateString(poolClass, poolClass.Length, out classId), "WindowsCreateString(pool)");
            Guid statics2Iid = new Guid("589B103F-6BBC-5DF5-A991-02E28B3B66D5");
            IntPtr statics2Ptr;
            CheckHr(RoGetActivationFactory(classId, ref statics2Iid, out statics2Ptr), "RoGetActivationFactory(framePool statics2)");
            FnCreateFreeThreaded createFreeThreaded = (FnCreateFreeThreaded)VtableFn(statics2Ptr, 6, typeof(FnCreateFreeThreaded));
            int poolHr = createFreeThreaded(statics2Ptr, inspectableDevice, pixelFormat, 2, itemSize, out poolPtr);
            Marshal.Release(statics2Ptr);
            CheckHr(poolHr, "Direct3D11CaptureFramePool.CreateFreeThreaded");

            FnPtrOutPtr createSession = (FnPtrOutPtr)VtableFn(poolPtr, 10, typeof(FnPtrOutPtr));
            CheckHr(createSession(poolPtr, itemPtr, out sessionPtr), "CreateCaptureSession");

            try
            {
                Guid session2Iid = new Guid("2C39AE40-7D2E-5044-804E-8B6799D4CF9E");
                IntPtr session2Ptr;
                if (Marshal.QueryInterface(sessionPtr, ref session2Iid, out session2Ptr) == 0)
                {
                    FnPutByte putCursor = (FnPutByte)VtableFn(session2Ptr, 7, typeof(FnPutByte));
                    putCursor(session2Ptr, 0);
                    Marshal.Release(session2Ptr);
                }
            }
            catch { }
            try
            {
                Guid session3Iid = new Guid("F2CDD966-22AE-5EA1-9596-3A289344C3BE");
                IntPtr session3Ptr;
                if (Marshal.QueryInterface(sessionPtr, ref session3Iid, out session3Ptr) == 0)
                {
                    FnPutByte putBorder = (FnPutByte)VtableFn(session3Ptr, 7, typeof(FnPutByte));
                    putBorder(session3Ptr, 0);
                    Marshal.Release(session3Ptr);
                }
            }
            catch { }

            FnThisOnly startCapture = (FnThisOnly)VtableFn(sessionPtr, 6, typeof(FnThisOnly));
            CheckHr(startCapture(sessionPtr), "StartCapture");

            FnOutPtr tryGetNextFrame = (FnOutPtr)VtableFn(poolPtr, 7, typeof(FnOutPtr));
            DateTime deadline = DateTime.UtcNow.AddSeconds(5);
            while (framePtr == IntPtr.Zero && DateTime.UtcNow < deadline)
            {
                CheckHr(tryGetNextFrame(poolPtr, out framePtr), "TryGetNextFrame");
                if (framePtr == IntPtr.Zero) { System.Threading.Thread.Sleep(15); }
            }
            if (framePtr == IntPtr.Zero) { throw new Exception("Windows.Graphics.Capture produced no frame within 5 seconds."); }

            FnOutPtr getSurface = (FnOutPtr)VtableFn(framePtr, 6, typeof(FnOutPtr));
            CheckHr(getSurface(framePtr, out surfacePtr), "Direct3D11CaptureFrame.Surface");

            Guid accessIid = new Guid("A9B3D012-3DF2-4EE3-B8D1-8695F457D3C1");
            CheckHr(Marshal.QueryInterface(surfacePtr, ref accessIid, out accessPtr), "QI IDirect3DDxgiInterfaceAccess");
            FnGetInterface getInterface = (FnGetInterface)VtableFn(accessPtr, 3, typeof(FnGetInterface));
            Guid textureIid = new Guid("6F15AAF2-D208-4E89-9AB4-489535D34F9C");
            CheckHr(getInterface(accessPtr, ref textureIid, out texturePtr), "IDirect3DDxgiInterfaceAccess.GetInterface");

            if (cropX < 0) { cropX = 0; }
            if (cropY < 0) { cropY = 0; }
            int cropW = width;
            int cropH = height;
            if (cropX + cropW > itemSize.Width) { cropW = itemSize.Width - cropX; }
            if (cropY + cropH > itemSize.Height) { cropH = itemSize.Height - cropY; }
            if (cropW <= 0 || cropH <= 0) { throw new Exception("Capture region is outside the monitor frame."); }

            D3D11_TEXTURE2D_DESC desc = new D3D11_TEXTURE2D_DESC();
            desc.Width = (uint)cropW;
            desc.Height = (uint)cropH;
            desc.MipLevels = 1;
            desc.ArraySize = 1;
            desc.Format = pixelFormat;
            desc.SampleCount = 1;
            desc.SampleQuality = 0;
            desc.Usage = 3;           // D3D11_USAGE_STAGING
            desc.BindFlags = 0;
            desc.CPUAccessFlags = 0x20000; // D3D11_CPU_ACCESS_READ
            desc.MiscFlags = 0;
            ID3D11DeviceAbi deviceAbi = (ID3D11DeviceAbi)Marshal.GetObjectForIUnknown(device);
            CheckHr(deviceAbi.CreateTexture2D(ref desc, IntPtr.Zero, out stagingPtr), "CreateTexture2D(staging)");
            Marshal.ReleaseComObject(deviceAbi);

            D3D11_BOX box = new D3D11_BOX();
            box.Left = (uint)cropX;
            box.Top = (uint)cropY;
            box.Front = 0;
            box.Right = (uint)(cropX + cropW);
            box.Bottom = (uint)(cropY + cropH);
            box.Back = 1;
            ID3D11DeviceContextAbi contextAbi = (ID3D11DeviceContextAbi)Marshal.GetObjectForIUnknown(context);
            contextAbi.CopySubresourceRegion(stagingPtr, 0, 0, 0, 0, texturePtr, 0, ref box);
            D3D11_MAPPED_SUBRESOURCE mapped;
            CheckHr(contextAbi.Map(stagingPtr, 0, 1, 0, out mapped), "Map(staging)");
            try
            {
                byte[] rowBytes = new byte[cropW * bytesPerPixel];
                byte[] bgra = new byte[cropW * cropH * 4];
                double invWhite = 1.0 / SdrWhiteScale(hmon);
                for (int y = 0; y < cropH; y++)
                {
                    Marshal.Copy(new IntPtr(mapped.Data.ToInt64() + (long)y * mapped.RowPitch), rowBytes, 0, rowBytes.Length);
                    int destBase = y * cropW * 4;
                    if (hdr)
                    {
                        for (int x = 0; x < cropW; x++)
                        {
                            int src = x * 8;
                            double r = HalfToFloat(BitConverter.ToUInt16(rowBytes, src)) * invWhite;
                            double g = HalfToFloat(BitConverter.ToUInt16(rowBytes, src + 2)) * invWhite;
                            double b = HalfToFloat(BitConverter.ToUInt16(rowBytes, src + 4)) * invWhite;
                            bgra[destBase + x * 4] = LinearToSrgbByte(b);
                            bgra[destBase + x * 4 + 1] = LinearToSrgbByte(g);
                            bgra[destBase + x * 4 + 2] = LinearToSrgbByte(r);
                            bgra[destBase + x * 4 + 3] = 255;
                        }
                    }
                    else
                    {
                        Array.Copy(rowBytes, 0, bgra, destBase, cropW * 4);
                    }
                }
                using (Bitmap bmp = new Bitmap(cropW, cropH, PixelFormat.Format32bppRgb))
                {
                    Rectangle rect = new Rectangle(0, 0, cropW, cropH);
                    BitmapData bits = bmp.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppRgb);
                    int destStride = Math.Abs(bits.Stride);
                    for (int y = 0; y < cropH; y++)
                    {
                        Marshal.Copy(bgra, y * cropW * 4, new IntPtr(bits.Scan0.ToInt64() + (long)y * destStride), cropW * 4);
                    }
                    bmp.UnlockBits(bits);
                    bmp.Save(outputPath, ImageFormat.Png);
                }
            }
            finally
            {
                contextAbi.Unmap(stagingPtr, 0);
                Marshal.ReleaseComObject(contextAbi);
            }
        }
        finally
        {
            SafeClose(sessionPtr);
            SafeClose(framePtr);
            SafeClose(poolPtr);
            if (classId != IntPtr.Zero) { WindowsDeleteString(classId); }
            if (stagingPtr != IntPtr.Zero) { Marshal.Release(stagingPtr); }
            if (texturePtr != IntPtr.Zero) { Marshal.Release(texturePtr); }
            if (accessPtr != IntPtr.Zero) { Marshal.Release(accessPtr); }
            if (surfacePtr != IntPtr.Zero) { Marshal.Release(surfacePtr); }
            if (framePtr != IntPtr.Zero) { Marshal.Release(framePtr); }
            if (sessionPtr != IntPtr.Zero) { Marshal.Release(sessionPtr); }
            if (poolPtr != IntPtr.Zero) { Marshal.Release(poolPtr); }
            if (itemPtr != IntPtr.Zero) { Marshal.Release(itemPtr); }
            if (inspectableDevice != IntPtr.Zero) { Marshal.Release(inspectableDevice); }
            if (dxgi != IntPtr.Zero) { Marshal.Release(dxgi); }
            if (context != IntPtr.Zero) { Marshal.Release(context); }
            if (device != IntPtr.Zero) { Marshal.Release(device); }
        }
    }
}
'@

# expand a short-path %TEMP% once - every Join-Path $env:TEMP below inherits
# the fix and WinRT never sees a '~' path (issues #27/#35)
$env:TEMP = [VoyageOcrImage]::LongPath($env:TEMP)

[void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
[void][Windows.Storage.FileAccessMode, Windows.Storage, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
[void][Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]
[void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType = WindowsRuntime]

function Await-Result {
    param(
        [Parameter(Mandatory = $true)]$AsyncOperation,
        [Parameter(Mandatory = $true)][Type]$ResultType)
    $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
        Where-Object {
            $_.Name -eq 'AsTask' -and
            $_.IsGenericMethod -and
            $_.GetParameters().Count -eq 1
        } |
        Select-Object -First 1
    $task = $method.MakeGenericMethod($ResultType).Invoke($null, @($AsyncOperation))
    $task.Wait()
    return $task.Result
}

function New-OcrEngine {
    param([string]$PreferredLanguage = '')

    $available = @([Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages)

    # Localized PoE clients need a matching OCR engine. Windows can expose the
    # Korean pack as either "ko" or a regional tag such as "ko-KR", so match
    # both the exact tag and its script/region variants before falling back to
    # any tag with the same primary language. Plain primary-language fallback
    # is unsafe for Chinese because both scripts share primary "zh": zh-Hant
    # (Traditional) must never silently pick zh-CN and vice versa.
    if (-not [string]::IsNullOrWhiteSpace($PreferredLanguage)) {
        $preferredTag = $PreferredLanguage.Trim()
        $preferredPrimary = ($preferredTag -split '-', 2)[0]
        $preferred = @($available | ForEach-Object {
            $tag = $_.LanguageTag
            $primary = ($tag -split '-', 2)[0]
            $score =
                if ($tag -ieq $preferredTag) { 0 }
                elseif ($tag -ilike ($preferredTag + '-*')) { 1 }
                elseif ($preferredTag -ieq 'zh-Hant' -and $tag -imatch '^zh[-_ ]?(hant|tw|hk|mo)') { 2 }
                elseif ($preferredTag -ieq 'zh-CN' -and $tag -imatch '^zh[-_ ]?(hans|cn|sg)') { 2 }
                elseif ($preferredTag -ieq 'ko-KR' -and $primary -ieq 'ko') { 3 }
                elseif ($primary -ieq $preferredPrimary) { 4 }
                else { 99 }
            [pscustomobject]@{ Language = $_; Score = $score }
        } | Where-Object { $_.Score -lt 99 } | Sort-Object Score | ForEach-Object { $_.Language })

        foreach ($language in $preferred) {
            $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
            if ($null -ne $engine) {
                return $engine
            }
        }

        throw ("Windows OCR language '$preferredTag' is not installed. " +
            'Install the matching Windows language OCR feature. For Korean run: ' +
            'DISM /Online /Add-Capability /CapabilityName:Language.OCR~~~ko-KR~0.0.1.0. ' +
            'For Traditional Chinese run: DISM /Online /Add-Capability ' +
            '/CapabilityName:Language.OCR~~~zh-Hant~0.0.1.0. ' +
            'For Simplified Chinese run: DISM /Online /Add-Capability ' +
            '/CapabilityName:Language.OCR~~~zh-Hans~0.0.1.0')
    }

    # English clients keep the original English-first behavior. Do not require
    # en-US specifically: many Windows installs only have en-GB or another
    # Latin-script OCR language.
    $english = @($available | Where-Object {
        $_.LanguageTag -eq 'en-US' -or $_.LanguageTag -like 'en-*'
    } | Sort-Object {
        if ($_.LanguageTag -eq 'en-US') { 0 } else { 1 }
    })

    foreach ($language in $english) {
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
        if ($null -ne $engine) {
            return $engine
        }
    }

    # Fall back to the Windows profile language (for example pl-PL). The
    # border matcher tolerates small OCR errors, and Latin-script recognizers
    # can still read the English tooltip text well enough for matching.
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if ($null -ne $engine) {
        return $engine
    }

    # A profile language may not be in the installed OCR list. Use any
    # recognizer as a final fallback rather than rejecting a usable setup.
    foreach ($language in $available) {
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
        if ($null -ne $engine) {
            return $engine
        }
    }

    throw ('Windows OCR has no installed language. Open an elevated Command Prompt and run: ' +
        'DISM /Online /Add-Capability /CapabilityName:Language.OCR~~~en-US~0.0.1.0')
}

function Invoke-OcrFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)]$Engine)

    $file = Await-Result ([Windows.Storage.StorageFile]::GetFileFromPathAsync($Path)) ([Windows.Storage.StorageFile])
    $stream = Await-Result ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    try {
        $decoder = Await-Result ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap = Await-Result ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        try {
            $result = Await-Result ($Engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
            $lines = @($result.Lines | ForEach-Object { $_.Text })
            if ($lines.Count -gt 0) { return $lines -join [Environment]::NewLine }
            return $result.Text
        } finally {
            if ($null -ne $bitmap) { $bitmap.Dispose() }
        }
    } finally {
        $stream.Dispose()
    }
}

function Read-OcrLines {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)]$engine)
    $preparedPath = Join-Path $env:TEMP "voyage-ocr-filtered-$PID-$([Guid]::NewGuid().ToString('N')).png"
    [VoyageOcrImage]::Prepare($Path, $preparedPath)

    try {
        $text = Invoke-OcrFile $preparedPath $engine

        # The lavender-only mask can occasionally be empty even though the
        # tooltip is visible. Retry the original screenshot before declaring
        # the border unreadable.
        if ([string]::IsNullOrWhiteSpace($text)) {
            $text = Invoke-OcrFile $Path $engine
        }
        # HDR desktops wash out GDI captures (issue #33): last chance, stretch
        # the contrast and try once more.
        if ([string]::IsNullOrWhiteSpace($text)) {
            $normalizedPath = Join-Path $env:TEMP "voyage-ocr-normalized-$PID-$([Guid]::NewGuid().ToString('N')).png"
            [VoyageOcrImage]::Normalize($Path, $normalizedPath)
            try {
                $text = Invoke-OcrFile $normalizedPath $engine
            } finally {
                Remove-Item -LiteralPath $normalizedPath -Force -ErrorAction SilentlyContinue
            }
        }
        if ([string]::IsNullOrWhiteSpace($text)) {
            throw 'Windows OCR returned no text after filtered, unfiltered and contrast-stretched scans. If Windows HDR is on, turn it off for the scan (Win+Alt+B).'
        }
        return $text
    } finally {
        Remove-Item -LiteralPath $preparedPath -Force -ErrorAction SilentlyContinue
    }
}

function Add-Block {
    param(
        [Parameter(Mandatory = $true)][System.Text.StringBuilder]$Builder,
        [Parameter(Mandatory = $true)][int]$Index,
        [Parameter(Mandatory = $true)][string]$Text)
    [void]$Builder.AppendLine("=== VOYAGE BORDER $Index ===")
    [void]$Builder.AppendLine($Text)
    [void]$Builder.AppendLine('=== END VOYAGE BORDER ===')
}

$utf8 = [System.Text.UTF8Encoding]::new($false)

function Write-Atomic {
    param([string]$Path, [string]$Text)
    $tmp = "$Path.tmp"
    [System.IO.File]::WriteAllText($tmp, $Text, $utf8)
    Move-Item -LiteralPath $tmp -Destination $Path -Force
}

# GDI CopyFromScreen returns washed-out pixels when Windows HDR is on
# (issue #33). CaptureMode auto switches to Windows.Graphics.Capture with
# float16 tone mapping when HDR is detected on the target monitor; gdi /
# wgc force one path (ini: [sweep] Capture). Any WGC failure falls back
# to plain GDI so the scan never gets worse than before.
function Save-ScreenRegion {
    param([int]$Left, [int]$Top, [int]$Width, [int]$Height, [string]$Path)
    if ($Width -le 0 -or $Height -le 0) {
        throw 'Invalid Path of Exile window size.'
    }
    $useWgc = $false
    if ($CaptureMode -eq 'wgc') {
        $useWgc = $true
    } elseif ($CaptureMode -ne 'gdi') {
        $hmon = [VoyageWgc]::MonitorForRegion($Left, $Top, $Width, $Height)
        $useWgc = [VoyageWgc]::IsHdrEnabled($hmon)
    }
    if ($useWgc) {
        try {
            [VoyageWgc]::CaptureRegion($Left, $Top, $Width, $Height, $Path, $false)
            return
        } catch { }
    }
    $image = [System.Drawing.Bitmap]::new($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($image)
    try {
        $graphics.CopyFromScreen($Left, $Top, 0, 0, $image.Size)
        $image.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $graphics.Dispose()
        $image.Dispose()
    }
}

function Get-BorderBlock {
    param([int]$Index, [int]$Left, [int]$Top, [int]$Width, [int]$Height, $Engine)
    $builder = [System.Text.StringBuilder]::new()
    $png = Join-Path $env:TEMP "voyage-border-$PID-$Index.png"
    try {
        Save-ScreenRegion -Left $Left -Top $Top -Width $Width -Height $Height -Path $png
        # keep a copy for the diagnostic bundle (overwritten every scan)
        Copy-Item -LiteralPath $png -Destination (Join-Path $env:TEMP ('voyage-diag-border-' + $Index + '.png')) -Force -ErrorAction SilentlyContinue
        Add-Block $builder $Index (Read-OcrLines $png $Engine)
    } catch {
        Add-Block $builder $Index ("OCR ERROR: " + $_.Exception.Message)
    } finally {
        Remove-Item -LiteralPath $png -Force -ErrorAction SilentlyContinue
    }
    return $builder.ToString()
}

function Get-OcrLineRects {
    param([string]$Path, $Engine, [double]$Scale, [double]$Pad)
    $file = Await-Result ([Windows.Storage.StorageFile]::GetFileFromPathAsync($Path)) ([Windows.Storage.StorageFile])
    $stream = Await-Result ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    try {
        $decoder = Await-Result ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap = Await-Result ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        try {
            $result = Await-Result ($Engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
            $found = @()
            foreach ($line in $result.Lines) {
                $minX = [double]::MaxValue
                $minY = [double]::MaxValue
                $maxX = 0.0
                $maxY = 0.0
                foreach ($word in $line.Words) {
                    $r = $word.BoundingRect
                    if ($r.X -lt $minX) { $minX = $r.X }
                    if ($r.Y -lt $minY) { $minY = $r.Y }
                    if (($r.X + $r.Width) -gt $maxX) { $maxX = $r.X + $r.Width }
                    if (($r.Y + $r.Height) -gt $maxY) { $maxY = $r.Y + $r.Height }
                }
                if ($minX -eq [double]::MaxValue) { continue }
                $found += [pscustomobject]@{
                    Text = $line.Text
                    X = ($minX - $Pad) / $Scale
                    Y = ($minY - $Pad) / $Scale
                    R = ($maxX - $Pad) / $Scale
                    B = ($maxY - $Pad) / $Scale
                }
            }
            return $found
        } finally {
            if ($null -ne $bitmap) { $bitmap.Dispose() }
        }
    } finally {
        $stream.Dispose()
    }
}

# Match tooltip blocks to border points as a GLOBAL assignment, not greedy
# nearest: tooltips render offset outward and stack along a side, so a
# tooltip's individually-nearest point is often its neighbour's. Start from
# the greedy solution, then 2-opt swap pairs until total distance is locally
# minimal - for 12 points this converges instantly and fixes the cascades.
# CONFIRMED against a player-annotated board (2026-08-14): this global
# matching placed all 12 correctly; plain cheapest-first greedy swapped the
# three corner pairs (top-left/left-top and friends). Keep the 2-opt.
function Resolve-BorderAssignment {
    param($Points, $Blocks)
    $count = $Points.Count
    $dist = New-Object 'double[,]' $count, $Blocks.Count
    for ($p = 0; $p -lt $count; $p++) {
        for ($b = 0; $b -lt $Blocks.Count; $b++) {
            $cx = ($Blocks[$b].X + $Blocks[$b].R) / 2.0
            $cy = ($Blocks[$b].Y + $Blocks[$b].B) / 2.0
            $dx = $cx - $Points[$p].X
            $dy = $cy - $Points[$p].Y
            $dist[$p, $b] = $dx * $dx + $dy * $dy
        }
    }
    $assigned = @($null) * $count
    $used = @{}
    $order = @()
    for ($p = 0; $p -lt $count; $p++) {
        for ($b = 0; $b -lt $Blocks.Count; $b++) {
            $order += [pscustomobject]@{ P = $p; B = $b; D = $dist[$p, $b] }
        }
    }
    foreach ($pair in ($order | Sort-Object D)) {
        if ($null -ne $assigned[$pair.P] -or $used.ContainsKey($pair.B)) { continue }
        $assigned[$pair.P] = $pair.B
        $used[$pair.B] = $true
    }
    $improved = $true
    $rounds = 0
    while ($improved -and $rounds -lt 50) {
        $improved = $false
        $rounds++
        for ($i = 0; $i -lt $count; $i++) {
            for ($j = $i + 1; $j -lt $count; $j++) {
                $bi = $assigned[$i]
                $bj = $assigned[$j]
                if ($null -eq $bi -or $null -eq $bj) { continue }
                if (($dist[$i, $bj] + $dist[$j, $bi]) -lt ($dist[$i, $bi] + $dist[$j, $bj])) {
                    $assigned[$i] = $bj
                    $assigned[$j] = $bi
                    $improved = $true
                }
            }
        }
    }
    return $assigned
}

# One held-Alt screenshot shows every border tooltip at once. OCR it with
# per-line geometry, cluster lines into tooltip blocks, then assign each
# block to a border point via the global matcher above.
function Get-AllBorderBlocks {
    param([int]$Left, [int]$Top, [int]$Width, [int]$Height, [string]$PointSpec, $Engine, [string]$ShotMarker = '')
    $builder = [System.Text.StringBuilder]::new()
    $png = Join-Path $env:TEMP "voyage-border-$PID-all.png"
    $prepared = Join-Path $env:TEMP "voyage-border-$PID-all-prep.png"
    try {
        Save-ScreenRegion -Left $Left -Top $Top -Width $Width -Height $Height -Path $png
        # the screenshot is on disk - tell the script it can put its status
        # tooltip back up without photobombing the capture
        if ($ShotMarker -ne '') {
            [System.IO.File]::WriteAllText($ShotMarker, 'SHOT')
        }
        # mirror the transform inside VoyageOcrImage::Prepare so rects map back
        $scale = [Math]::Min(2.0, 6000.0 / [Math]::Max($Width, $Height))
        [VoyageOcrImage]::Prepare($png, $prepared)
        $lines = @(Get-OcrLineRects $prepared $Engine $scale 64.0)
        if ($lines.Count -eq 0) { $lines = @(Get-OcrLineRects $png $Engine 1.0 0.0) }
        # HDR washout rescue (issue #33): contrast-stretch and retry
        if ($lines.Count -eq 0) {
            [VoyageOcrImage]::Normalize($png, $prepared)
            $lines = @(Get-OcrLineRects $prepared $Engine $scale 64.0)
        }
        # keep copies for the diagnostic bundle (overwritten every scan)
        Copy-Item -LiteralPath $png -Destination (Join-Path $env:TEMP 'voyage-diag-alt.png') -Force -ErrorAction SilentlyContinue
        if (Test-Path -LiteralPath $prepared) {
            Copy-Item -LiteralPath $prepared -Destination (Join-Path $env:TEMP 'voyage-diag-alt-prep.png') -Force -ErrorAction SilentlyContinue
        }
        if ($lines.Count -eq 0) { throw 'Windows OCR found no border tooltips in the Alt overview. If Windows HDR is on, turn it off for the scan (Win+Alt+B).' }
        # cluster vertically-adjacent, horizontally-overlapping lines
        $blocks = @()
        foreach ($line in ($lines | Sort-Object Y)) {
            $joined = $false
            foreach ($block in $blocks) {
                $lineHeight = [Math]::Max(12.0, $line.B - $line.Y)
                $xOverlap = [Math]::Min($line.R, $block.R) - [Math]::Max($line.X, $block.X)
                if (($line.Y - $block.B) -le ($lineHeight * 0.9) -and $xOverlap -gt 0) {
                    $block.Text = $block.Text + [Environment]::NewLine + $line.Text
                    if ($line.X -lt $block.X) { $block.X = $line.X }
                    if ($line.R -gt $block.R) { $block.R = $line.R }
                    if ($line.B -gt $block.B) { $block.B = $line.B }
                    $joined = $true
                    break
                }
            }
            if (-not $joined) {
                $blocks += [pscustomobject]@{ Text = $line.Text; X = $line.X; Y = $line.Y; R = $line.R; B = $line.B }
            }
        }
        # Ground-loot labels are blue, blue passes the tooltip mask, and a
        # 13th text block then displaces a real tooltip in the 12-slot
        # assignment (issue #41: "HYDRASCALE BOOTS" stole a border). Every
        # real border tooltip mentions adjacency in English or Korean, so
        # gate the clusters on that. A tooltip mangled beyond recognition
        # gets dropped here too, which just means a hover rescan - never a
        # loot label imported as a border.
        $blocks = @($blocks | Where-Object { $_.Text -match 'adjacent|areas|voyage|인접|지역|항해' })
        $points = @()
        foreach ($pair in $PointSpec.Split(';')) {
            $xy = $pair.Split(',')
            $points += [pscustomobject]@{ X = [double]$xy[0]; Y = [double]$xy[1] }
        }
        $assigned = Resolve-BorderAssignment $points $blocks
        for ($p = 0; $p -lt $points.Count; $p++) {
            if ($null -ne $assigned[$p]) {
                Add-Block $builder $p $blocks[$assigned[$p]].Text
            } else {
                Add-Block $builder $p 'OCR ERROR: no tooltip found near this border.'
            }
        }
    } catch {
        $builder = [System.Text.StringBuilder]::new()
        for ($p = 0; $p -lt 12; $p++) {
            Add-Block $builder $p ('OCR ERROR: ' + $_.Exception.Message)
        }
    } finally {
        Remove-Item -LiteralPath $png -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $prepared -Force -ErrorAction SilentlyContinue
    }
    return $builder.ToString()
}

if ($ImagePath) {
    $engine = New-OcrEngine -PreferredLanguage $PreferredLanguage
    $builder = [System.Text.StringBuilder]::new()
    Add-Block $builder 0 (Read-OcrLines $ImagePath $engine)
    [System.IO.File]::WriteAllText($OutputPath, $builder.ToString(), $utf8)
    exit 0
}

if (-not $Session) {
    throw 'Server mode needs -Session.'
}

# Server mode: the expensive parts (C# compile above, OCR engine here) happen
# ONCE, then each border is a quick file-signalled capture + recognition.
$engine = New-OcrEngine -PreferredLanguage $PreferredLanguage
# the ready handshake carries the engine language so the activity log can
# show WHICH recognizer is reading the tooltips (a wrong-language engine
# returns empty text on perfect captures and is invisible otherwise)
$engineTag = ''
try { $engineTag = $engine.RecognizerLanguage.LanguageTag } catch { }
Write-Atomic $OutputPath ('READY|' + $engineTag)
$cmdFile = "$Session.cmd"
while ($true) {
    # transient file contention (the AutoHotkey side moving/reading files at
    # the same instant) must never terminate the server - swallow and retry
    try {
        if (-not (Test-Path -LiteralPath $cmdFile)) {
            Start-Sleep -Milliseconds 40
            continue
        }
        $line = ([System.IO.File]::ReadAllText($cmdFile, $utf8)).Trim()
        Remove-Item -LiteralPath $cmdFile -Force -ErrorAction SilentlyContinue
        if ($line -eq 'quit') { break }
        $parts = $line.Split('|')
        if ($parts[0] -eq 'scanall' -and $parts.Count -ge 7) {
            # any failure must surface INSTANTLY as a parseable error result -
            # a swallowed exception here once cost a silent 90-second timeout
            try {
                $block = Get-AllBorderBlocks -Left ([int]$parts[2]) -Top ([int]$parts[3]) -Width ([int]$parts[4]) -Height ([int]$parts[5]) -PointSpec $parts[6] -Engine $engine -ShotMarker "$Session-shot-all.txt"
            } catch {
                $block = '=== VOYAGE SCANALL ERROR ===' + [Environment]::NewLine + $_.Exception.Message
            }
            Write-Atomic "$Session-res-all.txt" $block
            continue
        }
        if ($parts[0] -ne 'capture' -or $parts.Count -lt 6) { continue }
        $idx = [int]$parts[1]
        # same instant-error contract as scanall: whatever goes wrong, the
        # script gets a parseable answer now, not a 90-second timeout
        try {
            $block = Get-BorderBlock -Index $idx -Left ([int]$parts[2]) -Top ([int]$parts[3]) -Width ([int]$parts[4]) -Height ([int]$parts[5]) -Engine $engine
        } catch {
            $block = '=== VOYAGE BORDER ' + $idx + ' ===' + [Environment]::NewLine + 'OCR ERROR: ' + $_.Exception.Message + [Environment]::NewLine + '=== END VOYAGE BORDER ==='
        }
        Write-Atomic "$Session-res-$idx.txt" $block
    } catch {
        Start-Sleep -Milliseconds 60
    }
}
)"
}

EnsureOcrHelper() {
    global OcrHelper
    try FileDelete OcrHelper
    FileAppend OcrPowerShell(), OcrHelper, "UTF-8"
}

RunOcrHelper(arguments, cancellable := true) {
    global OcrHelper, OcrOutput, OcrPid, OcrTimeout, Running
    try FileDelete OcrOutput
    EnsureOcrHelper()
    quote := Chr(34)
    command := "powershell.exe -NoProfile -ExecutionPolicy Bypass -File "
        . quote OcrHelper quote " " arguments " -OutputPath " quote OcrOutput quote
    Run command, , "Hide", &OcrPid
    deadline := A_TickCount + OcrTimeout * 1000
    while ProcessExist(OcrPid) {
        if (cancellable && !Running) {
            ProcessClose OcrPid
            OcrPid := 0
            return ""
        }
        if (A_TickCount > deadline) {
            ProcessClose OcrPid
            OcrPid := 0
            MsgBox "Windows OCR timed out. Try again, or raise OcrTimeout in the script."
            return ""
        }
        Sleep 100
    }
    OcrPid := 0
    if !FileExist(OcrOutput)
        return ""
    return FileRead(OcrOutput, "UTF-8")
}

PreferredOcrLanguage() {
    if (OcrLanguage != "")
        return OcrLanguage
    hwnd := FindPoeWindow()
    if !hwnd
        return ""
    try {
        processName := WinGetProcessName(hwnd)
        if RegExMatch(processName, "i)_KG\.exe$")
            return "ko-KR"
        if RegExMatch(processName, "i)_TW\.exe$")
            return "zh-Hant"
        if RegExMatch(processName, "i)_CN\.exe$")
            return "zh-CN"
        title := WinGetTitle(hwnd)
        if InStr(title, "流亡黯道")
            return "zh-Hant"
        if InStr(title, "流放之路")
            return "zh-CN"
    }
    return ""
}

StartOcrServer() {
    global OcrHelper, OcrSession, OcrPid, CaptureMode
    if (OcrPid && ProcessExist(OcrPid))
        return
    try FileDelete OcrSession ".ready"
    try FileDelete OcrSession ".cmd"
    EnsureOcrHelper()
    quote := Chr(34)
    preferredLanguage := PreferredOcrLanguage()
    languageArg := preferredLanguage != ""
        ? " -PreferredLanguage " quote preferredLanguage quote
        : ""
    Log("OCR server starting | capture " CaptureMode)
    command := "powershell.exe -NoProfile -ExecutionPolicy Bypass -File "
        . quote OcrHelper quote " -Session " quote OcrSession quote
        . languageArg
        . " -CaptureMode " quote CaptureMode quote
        . " -OutputPath " quote OcrSession ".ready" quote
    Run command, , "Hide", &OcrPid
}

WaitOcrReady(timeoutMs) {
    global OcrSession, OcrPid, Running
    started := A_TickCount
    deadline := A_TickCount + timeoutMs
    while (A_TickCount < deadline) {
        if !Running
            return ""
        if FileExist(OcrSession ".ready") {
            content := Trim(FileRead(OcrSession ".ready", "UTF-8"), " `t`r`n")
            ; READY|<languageTag>: log which recognizer will read the tooltips -
            ; a wrong-language engine "works" but returns empty or garbage text
            if (SubStr(content, 1, 5) = "READY") {
                lang := SubStr(content, 7)
                Log("OCR ready in " (A_TickCount - started) "ms | engine language "
                    . (lang = "" ? "unknown" : lang))
                return "READY"
            }
            return content
        }
        if !ProcessExist(OcrPid)
            return "OCR HELPER ERROR: the helper exited before becoming ready."
        Sleep 50
    }
    return "OCR HELPER ERROR: timed out waiting for Windows OCR to initialize."
}

OcrSendCommand(text) {
    global OcrSession
    try FileDelete OcrSession ".cmd.tmp"
    FileAppend text, OcrSession ".cmd.tmp", "UTF-8"
    try FileMove OcrSession ".cmd.tmp", OcrSession ".cmd", 1
}

OcrHelperLastWords() {
    global OcrSession
    if FileExist(OcrSession ".ready")
        return Trim(FileRead(OcrSession ".ready", "UTF-8"), " `t`r`n")
    return "no error output was left behind"
}

OcrCaptureBorder(index, winX, winY, winW, winH) {
    global OcrSession, OcrPid, OcrTimeout, Running
    Loop 2 { ; a dead helper is restarted once, then the capture is retried
        resFile := OcrSession "-res-" index ".txt"
        try FileDelete resFile
        OcrSendCommand("capture|" index "|" winX "|" winY "|" winW "|" winH)
        deadline := A_TickCount + OcrTimeout * 1000
        helperDied := false
        while (A_TickCount < deadline) {
            if !Running
                return ""
            if FileExist(resFile) {
                block := FileRead(resFile, "UTF-8")
                try FileDelete resFile
                return block
            }
            if !ProcessExist(OcrPid) {
                helperDied := true
                break
            }
            Sleep 40
        }
        if !helperDied
            return "=== VOYAGE BORDER " index " ===`nOCR ERROR: capture timed out.`n=== END VOYAGE BORDER ==="
        reason := OcrHelperLastWords()
        if (A_Index = 2)
            return "=== VOYAGE BORDER " index " ===`nOCR ERROR: helper died twice. Last error: " reason "`n=== END VOYAGE BORDER ==="
        ; restart the helper and retry this border once
        OcrPid := 0
        StartOcrServer()
        ready := WaitOcrReady(45000)
        if (ready != "READY")
            return "=== VOYAGE BORDER " index " ===`nOCR ERROR: helper restart failed: " ready ". Original error: " reason "`n=== END VOYAGE BORDER ==="
    }
}

StopOcrServer() {
    global OcrSession, OcrPid
    if (OcrPid && ProcessExist(OcrPid)) {
        OcrSendCommand("quit")
        deadline := A_TickCount + 2000
        while (ProcessExist(OcrPid) && A_TickCount < deadline)
            Sleep 50
        if ProcessExist(OcrPid)
            try ProcessClose OcrPid
    }
    OcrPid := 0
    try FileDelete OcrSession ".cmd"
    try FileDelete OcrSession ".ready"
}

; Preferred path: the game now reveals EVERY border tooltip while Alt is held,
; so one screenshot + one OCR pass covers all 12 (seconds instead of 15-30s).
; Tooltip text is assigned to segments by proximity to the calibration points.
; Any failure falls back to the per-border hover scan below.
ScanBordersAlt() {
    global AltRevealDelay, OcrSession, OcrPid, OcrTimeout, Running
    poeHwnd := FindPoeWindow()
    if !poeHwnd
        return "ABORT"
    WinGetPos &winX, &winY, &winW, &winH, poeHwnd
    StartOcrServer()
    ready := WaitOcrReady(45000)
    if (ready = "" || !Running)
        return "ABORT"
    if (ready != "READY") {
        StopOcrServer()
        MsgBox "Border OCR unavailable:`n`n" ready
        return "ABORT"
    }
    points := ""
    for index, point in BorderPoints()
        points .= (points = "" ? "" : ";") (point[1] - winX) "," (point[2] - winY)
    ToolTip "Reading all 12 borders in one Alt scan..."
    ; park the cursor mid-board so no single tooltip is hover-highlighted
    MouseMove winX + winW // 2, winY + winH // 2, 0
    Send "{Alt down}"
    Sleep AltRevealDelay
    ; hide our status tooltip before the capture - it's a topmost window, so
    ; it gets baked into the screenshot and can sit right on top of a border
    ; tooltip the OCR needs to read
    ToolTip()
    Sleep 30
    resFile := OcrSession "-res-all.txt"
    shotFile := OcrSession "-shot-all.txt"
    try FileDelete resFile
    try FileDelete shotFile
    OcrSendCommand("scanall|all|" winX "|" winY "|" winW "|" winH "|" points)
    block := ""
    scanStart := A_TickCount
    deadline := A_TickCount + OcrTimeout * 1000
    while (A_TickCount < deadline) {
        if !Running
            break
        ; once the helper signals the screenshot is on disk, the status text
        ; can come back for the OCR wait without photobombing anything
        if (shotFile != "" && FileExist(shotFile)) {
            try FileDelete shotFile
            shotFile := ""
            ToolTip "Reading all 12 borders in one Alt scan..."
        }
        if FileExist(resFile) {
            block := FileRead(resFile, "UTF-8")
            try FileDelete resFile
            break
        }
        if !ProcessExist(OcrPid)
            break
        Sleep 40
    }
    Send "{Alt up}"
    ToolTip()
    if !Running
        return "ABORT"
    ; say WHY the overview came back empty - a silent "" here once cost a
    ; field user a mystery 90-second stall with nothing in the log
    if (block = "") {
        elapsed := A_TickCount - scanStart
        if !ProcessExist(OcrPid)
            Log("alt scan | helper died after " elapsed "ms | " SubStr(OcrHelperLastWords(), 1, 300))
        else
            Log("alt scan | no result after " elapsed "ms - timed out")
    } else if InStr(block, "=== VOYAGE SCANALL ERROR ===") {
        Log("alt scan | helper error after " (A_TickCount - scanStart) "ms | "
            . SubStr(RegExReplace(block, "\R", " / "), 1, 300))
        block := ""
    }
    return block
}

; split a payload of "=== VOYAGE BORDER n ===" blocks into index -> inner text
ParseBorderBlocks(blob) {
    blocks := Map()
    pos := 1
    while (pos := RegExMatch(blob, "=== VOYAGE BORDER (\d+) ===\R([\s\S]*?)\R=== END VOYAGE BORDER ===", &m, pos)) {
        blocks[m[1] + 0] := m[2]
        pos += StrLen(m[0])
    }
    return blocks
}

ArrayHas(arr, value) {
    for , item in arr
        if (item = value)
            return true
    return false
}

; a real border tooltip always mentions adjacency (English or Korean) -
; anything else that sneaks through OCR (loot labels, stray UI text) gets
; the hover-rescan treatment instead of being imported as a border
BorderBlockLooksReal(text) {
    return RegExMatch(text, "i)adjacent|areas|voyage|인접|지역|항해") ? true : false
}

; Hybrid border scan: the one-screenshot Alt overview covers most segments in
; seconds; any SUSPECT segment (missing, errored, or a suspiciously tall block
; that smells like two tooltips merged at a cramped resolution) gets the slow
; per-border hover treatment individually. Worst case on an odd setup is a
; slightly slower scan, never silently wrong borders.
ScanBorders() {
    global AltScanBorders
    if (AltScanBorders != 0) {
        result := ScanBordersAlt()
        if (result = "ABORT") {
            StopOcrServer()
            return ""
        }
        if (result != "") {
            blocks := ParseBorderBlocks(result)
            suspects := []
            Loop 12 {
                idx := A_Index - 1
                if (!blocks.Has(idx) || InStr(blocks[idx], "OCR ERROR")
                    || StrSplit(blocks[idx], "`n").Length >= 4
                    || !BorderBlockLooksReal(blocks[idx]))
                    suspects.Push(A_Index) ; 1-based for BorderPoints()
            }
            suspectNote := ""
            for , i in suspects
                suspectNote .= (suspectNote = "" ? "" : ",") i
            Log("alt scan | " blocks.Count " blocks | suspects: " (suspectNote = "" ? "none" : suspectNote))
            if (suspects.Length <= 4) {
                if (suspects.Length > 0) {
                    ToolTip "Alt scan read " (12 - suspects.Length) "/12 - hovering the other " suspects.Length "..."
                    rescans := ParseBorderBlocks(ScanBordersHover(suspects))
                    for , i in suspects
                        if rescans.Has(i - 1)
                            blocks[i - 1] := rescans[i - 1]
                }
                finalBlob := ""
                Loop 12 {
                    idx := A_Index - 1
                    if blocks.Has(idx)
                        finalBlob .= (finalBlob = "" ? "" : "`n")
                            . "=== VOYAGE BORDER " idx " ===`n" blocks[idx] "`n=== END VOYAGE BORDER ==="
                }
                StopOcrServer()
                SaveDiagText("borders", finalBlob)
                return finalBlob
            }
            ; 5+ suspects: the overview is unreliable here - hover everything
        }
        Log("alt overview unusable - full per-border fallback")
        ToolTip "Alt overview didn't work here - falling back to the per-border scan..."
    }
    result := ScanBordersHover()
    StopOcrServer()
    SaveDiagText("borders", result)
    return result
}

ScanBordersHover(only := 0) {
    global BorderHoverDelay, BorderOcrAttempts, Running
    Log("hover scan | " (only ? "rescanning " only.Length " suspect(s)" : "all 12"))
    poeHwnd := FindPoeWindow()
    if !poeHwnd
        return ""
    WinGetPos &winX, &winY, &winW, &winH, poeHwnd
    ; one persistent helper per sweep: PowerShell boots and compiles while we
    ; hover the first border, then every border is a quick capture + read
    StartOcrServer()
    result := ""
    ready := ""
    for index, point in BorderPoints() {
        if !Running
            break
        if (only && !ArrayHas(only, index))
            continue
        block := ""
        borderStart := A_TickCount
        Loop BorderOcrAttempts {
            if !Running
                break
            attempt := A_Index
            ToolTip "Moving to board border " index "/12..."
                . (attempt > 1 ? "`nRetrying empty OCR scan..." : "")
            MouseMove point[1], point[2], 0
            Sleep BorderHoverDelay + (attempt - 1) * 200
            ToolTip()
            Sleep 30
            if (ready = "") {
                ready := WaitOcrReady(45000)
                if (ready = "")
                    break
                if (ready != "READY") {
                    StopOcrServer()
                    MsgBox "Border OCR unavailable:`n`n" ready
                    return ""
                }
            }
            block := OcrCaptureBorder(index - 1, winX, winY, winW, winH)
            if !InStr(block, "Windows OCR returned no text")
                break
        }
        ; per-border health: errors and pathological slowness both go to the
        ; log, so a bundle shows exactly where a scan spent its time
        borderMs := A_TickCount - borderStart
        if InStr(block, "OCR ERROR")
            Log("hover border " index " | " borderMs "ms | "
                . SubStr(RegExReplace(block, "\R", " / "), 1, 250))
        else if (borderMs > 8000)
            Log("hover border " index " | slow: " borderMs "ms")
        if (block != "")
            result .= (result = "" ? "" : "`n") block
    }
    return result
}

; Developer smoke-test: run the embedded Windows OCR helper against an image.
if A_Args.Length >= 2 && A_Args[1] = "--ocr-file" {
    quote := Chr(34)
    languageArg := A_Args.Length >= 3
        ? " -PreferredLanguage " quote A_Args[3] quote
        : ""
    result := RunOcrHelper("-ImagePath " quote A_Args[2] quote languageArg, false)
    FileAppend result, "*", "UTF-8"
    ExitApp
}

; ---- capture the outer board-border rectangle (default Shift+F7 / Shift+F8) ----
SetBorderTopLeft(*) {
    global
    WizardOnAction("BorderTL")
    ClearExactBorderCalibration()
    MouseGetPos &x, &y
    BorderTLx := x, BorderTLy := y
    IniWrite BorderTLx, IniFile, "board", "TopLeftX"
    IniWrite BorderTLy, IniFile, "board", "TopY"
    Flash "Top-left board border set: " BorderTLx ", " BorderTLy
}
SetBorderBottomRight(*) {
    global
    ClearExactBorderCalibration()
    MouseGetPos &x, &y
    BorderBRx := x, BorderBRy := y
    IniWrite BorderBRx, IniFile, "board", "BottomRightX"
    IniWrite BorderBRy, IniFile, "board", "BottomY"
    WizardOnAction("BorderBR")
    Flash "Bottom-right board border set: " BorderBRx ", " BorderBRy
}

; ---- guided exact calibration of all 12 modifiers (default Ctrl+F5 / Ctrl+F6) ----
StartExactCalibration(*) {
    global
    ClearExactBorderCalibration()
    ExactBorderNext := 1
    WizardOnAction("ExactStart")
    Flash "Exact border calibration started."
        . "`nHover 1/12: " BorderPointLabel(ExactBorderNext)
        . "`nPress " KeyLabel(Keys["WizardSet"]) " to save it.", 5000
}

SaveExactPoint(*) {
    global
    if (ExactBorderNext < 1 || ExactBorderNext > 12) {
        Flash "Border recording isn't active - open the wizard's border step.", 3500
        return
    }

    MouseGetPos &x, &y
    savedIndex := ExactBorderNext
    ExactBorderPoints.Push([x, y])
    IniWrite x, IniFile, "board-exact", "Point" savedIndex "X"
    IniWrite y, IniFile, "board-exact", "Point" savedIndex "Y"
    ExactBorderNext++

    if (ExactBorderNext > 12) {
        ExactBorderNext := 0
        WizardOnAction("ExactDone")
        Flash "Exact border calibration complete: 12/12.", 4000
        return
    }

    WizardOnAction("ExactSave")
    Flash "Saved " savedIndex "/12: " BorderPointLabel(savedIndex)
        . "`nNext " ExactBorderNext "/12: " BorderPointLabel(ExactBorderNext)
        . "`nHover it and press " KeyLabel(Keys["WizardSet"]) ".", 5000
}

; ---- preview border positions without OCR (default Ctrl+F4) ----
PreviewBorders(*) {
    global
    WizardOnAction("BorderPreview")
    if Running {
        Flash "A scan or preview is already running.", 2500
        return
    }
    if !BoardCalibrated() {
        MsgBox "Borders aren't calibrated yet - finish the wizard's border step first."
        return
    }
    if !FindPoeWindow() {
        MsgBox "Can't find the PoE window. Accepted titles: " PoeWinTitles.Join(" / ") "."
        return
    }

    Running := true
    poeHwnd := FindPoeWindow()
    WinActivate poeHwnd
    if !WinWaitActive(poeHwnd, , 2) {
        Running := false
        Flash "Couldn't focus PoE.", 3000
        return
    }

    for index, point in BorderPoints() {
        if !Running
            break
        MouseMove point[1], point[2], 0
        ToolTip "Border preview " index "/12"
            . "`n" BorderPointLabel(index)
            . "`n(" KeyLabel(Keys["Abort"]) " to abort)", 20, 20
        Sleep BorderPreviewDelay
    }

    completed := Running
    Running := false
    ToolTip()
    if completed
        Flash "Border preview complete. No OCR was run.", 3500
}

; ---- capture the chart grid corners (default F7 / F8) ----
SetGridTopLeft(*) {
    global
    WizardOnAction("GridTL")
    MouseGetPos &x, &y
    TLx := x, TLy := y
    IniWrite TLx, IniFile, "grid", "TLx"
    IniWrite TLy, IniFile, "grid", "TLy"
    Flash "Top-left set: " TLx ", " TLy
}
SetGridBottomRight(*) {
    global
    WizardOnAction("GridBR")
    MouseGetPos &x, &y
    BRx := x, BRy := y
    IniWrite BRx, IniFile, "grid", "BRx"
    IniWrite BRy, IniFile, "grid", "BRy"
    Flash "Bottom-right set: " BRx ", " BRy
}
; how many fully blank rows end a page sweep (wizard-only setting)
PromptEmptySkip(*) {
    global EmptySkipRows, IniFile
    result := InputBox("Skip the rest of a page after how many fully blank rows in a row?"
        . "`n0 = never skip (scan every cell).", "Blank-row skip", "w380 h140", EmptySkipRows)
    if (result.Result != "OK")
        return
    if !RegExMatch(Trim(result.Value), "^\d+$") {
        Flash "Enter a whole number (0 or more).", 2500
        return
    }
    EmptySkipRows := Trim(result.Value) + 0
    IniWrite EmptySkipRows, IniFile, "sweep", "EmptySkipRows"
    WizardOnAction("EmptySkip")
    Flash "Blank-row skip: " (EmptySkipRows = 0 ? "never skip" : "after " EmptySkipRows " blank rows"), 2500
}

; the chart panel's two page-tab buttons (wizard-only calibration)
SetPageTab(n) {
    global
    WizardOnAction("PageTab" n)
    MouseGetPos &x, &y
    if (n = 1) {
        Page1TabX := x, Page1TabY := y
        IniWrite Page1TabX, IniFile, "pages", "Tab1X"
        IniWrite Page1TabY, IniFile, "pages", "Tab1Y"
    } else {
        Page2TabX := x, Page2TabY := y
        IniWrite Page2TabX, IniFile, "pages", "Tab2X"
        IniWrite Page2TabY, IniFile, "pages", "Tab2Y"
    }
    Flash "Page " n " tab set: " x ", " y
}

; the script sends Ctrl (copies/paste) and holds Alt (border reveal) - make
; sure none of them stay logically held if a sweep ends mid-keystroke
ReleaseModifiers() {
    Send "{Ctrl up}{Alt up}{Shift up}"
}

; ---- abort (default F10) ----
AbortAll(*) {
    global Running, OcrPid, ExactBorderNext
    Running := false
    ExactBorderNext := 0
    if OcrPid && ProcessExist(OcrPid) {
        ProcessClose OcrPid
        OcrPid := 0
    }
    ReleaseModifiers()
    Flash "Aborting..."
}

; ---- borders-only import: OCR the 12 borders, paste, done (default Shift+F9) ----
RunBordersOnly(*) {
    global
    if Running {
        Flash "A scan is already running.", 2500
        return
    }
    if !BoardCalibrated() {
        MsgBox "Borders aren't calibrated yet. Right-click the tray icon -> Setup wizard..."
        return
    }
    if !FindPoeWindow() {
        MsgBox "Can't find the PoE window. Accepted titles: " PoeWinTitles.Join(" / ") "."
        return
    }
    if !WinExist(BrowserWinTitle) {
        MsgBox "Can't find a window titled '" BrowserWinTitle "'.`nOpen the solver and make it the active browser tab."
        return
    }

    Running := true
    poeHwnd := FindPoeWindow()
    WinActivate poeHwnd
    if !WinWaitActive(poeHwnd, , 2) {
        Running := false
        Flash "Couldn't focus PoE.", 3000
        return
    }
    Sleep ActivateDelay

    Log("borders-only start")
    ToolTip "Reading 12 board borders with Windows OCR..."
        . "`nThis can take 15-30 seconds on a 4K screen."
        . "`n(" KeyLabel(Keys["Abort"]) " to abort)"
    borderBlob := ScanBorders()
    ToolTip()
    Log("borders-only | " (borderBlob != "" ? "sent" : "FAILED"))

    if (Running && borderBlob != "") {
        A_Clipboard := borderBlob
        ClipWait(1)
        WinActivate BrowserWinTitle
        if WinWaitActive(BrowserWinTitle, , 2) {
            Sleep ActivateDelay
            Send "^v"
            Sleep PasteDelay
        } else {
            Running := false
            Flash "Scanned the borders but couldn't focus the browser to paste.", 4000
            return
        }
    }

    completed := Running
    Running := false
    ReleaseModifiers()
    Flash completed
        ? (borderBlob != "" ? "Done. Sent 12 border OCR scans." : "Border OCR returned nothing - check calibration.")
        : "Aborted.", 5000
}

; ---- the real import sweep (default F9) ----
RunSweep(*) {
    global
    if !Calibrated() {
        MsgBox "Not calibrated yet. Right-click the tray icon -> Setup wizard..."
        return
    }
    if !FindPoeWindow() {
        MsgBox "Can't find the PoE window. Accepted titles: " PoeWinTitles.Join(" / ") "."
        return
    }
    if !WinExist(BrowserWinTitle) {
        MsgBox "Can't find a window titled '" BrowserWinTitle "'.`nOpen the solver and make it the active browser tab."
        return
    }

    Running := true
    copied := 0, skipped := 0, nonChart := 0, blob := "", borderBlob := ""
    firstChart := "", allIdentical := true

    ; ---- Phase 1: copy every chart while staying in PoE ----
    poeHwnd := FindPoeWindow()
    WinActivate poeHwnd
    if !WinWaitActive(poeHwnd, , 2) {
        Running := false
        Flash "Couldn't focus PoE.", 3000
        return
    }
    Sleep ActivateDelay

    pages := PagesCalibrated() ? 2 : 1
    Log("sweep start | grid " GridCols "x" GridRows " | pages " pages
        . " | EmptySkipRows " EmptySkipRows " | AltScan " AltScanBorders)
    Loop pages {
        if !Running
            break
        page := A_Index
        if (pages = 2) {
            Click (page = 1 ? Page1TabX : Page2TabX), (page = 1 ? Page1TabY : Page2TabY)
            Sleep PageFlipDelay
        }
        ; charts pack from the top - a run of empty cells means the rest of
        ; the page is blank, so stop paying the clipboard timeout for them
        ; (row count set in the wizard; 0 disables for bottom-parked charts)
        emptyStreak := 0
        emptySkipCells := EmptySkipRows * GridCols
        Loop GridRows {
            if !Running
                break
            r := A_Index - 1
            Loop GridCols {
                if !Running
                    break 2
                c := A_Index - 1
                p := CellPos(r, c)
                A_Clipboard := ""
                MouseMove p[1], p[2], 0
                Sleep HoverDelay
                Send "^c"
                if !ClipWait(ClipTimeout) {
                    skipped++             ; empty slot - nothing copied
                    emptyStreak++
                    if (emptySkipCells > 0 && emptyStreak >= emptySkipCells) {
                        ToolTip "Page " page ": " EmptySkipRows " blank rows - skipping the rest..."
                        break 2
                    }
                    continue
                }
                clip := Trim(A_Clipboard, " `t`r`n")
                if !IsChartText(clip) {
                    skipped++             ; not a Chart item
                    nonChart++
                    emptyStreak := 0
                    continue
                }
                emptyStreak := 0
                ; Keep identical item text: separate physical Charts are separate
                ; solver pieces even when every copied property is the same.
                blob .= (blob = "" ? "" : "`n") clip
                copied++
                if (firstChart = "")
                    firstChart := clip
                else if (clip != firstChart)
                    allIdentical := false
                ToolTip "Copying page " page "... row " (r+1) " col " (c+1)
                    . "`ncharts " copied "   skipped " skipped
                    . "`n(" KeyLabel(Keys["Abort"]) " to abort)"
            }
        }
    }
    ; leave PoE back on page 1 for the player
    if (pages = 2 && Running) {
        Click Page1TabX, Page1TabY
        Sleep PageFlipDelay
    }
    Log("sweep phase 1 | copied " copied " | skipped " skipped " | nonChart " nonChart)
    SaveDiagText("charts", blob)

    ; Calibration sanity guard: distinct physical Charts always differ in their
    ; rolled values, so EVERY grid cell copying the same text means the mouse
    ; hovered one item the whole sweep - the grid corners are wrong (issue #20).
    calibWarn := ""
    if Running && copied >= 5 && allIdentical {
        blob := "", copied := 0
        calibWarn := "Every grid cell copied the SAME chart, so none were sent"
            . " - your grid calibration looks wrong (or PoE's window moved)."
            . " Re-run the tray Setup wizard and click the grid corners again."
    }
    ; Zero-copy diagnostics: a sweep that copies NOTHING almost always means
    ; the game never received Ctrl+C or the grid is aimed at the wrong panel -
    ; without this, the blank-row skip makes it look like a 2-row "mini sweep".
    if (Running && calibWarn = "" && copied = 0) {
        if (nonChart > 0)
            calibWarn := "Copied " nonChart " item(s) that aren't Charts - the grid corners"
                . " are probably calibrated over the wrong panel. Open the Voyage chart"
                . " panel and re-run the tray Setup wizard."
        else
            calibWarn := "Nothing was ever copied - Ctrl+C isn't reaching the game,"
                . " or the grid isn't over your charts."
                . " Usual causes: the grid corners were set on the big 3x3 Voyage board"
                . " instead of the chart INVENTORY squares on the right (re-run the wizard),"
                . " PoE runs as administrator (run this script as admin too),"
                . " controller input mode (switch to mouse+keyboard), or exclusive"
                . " Fullscreen (use Windowed)."
                . " (If the chart inventory is genuinely empty, ignore this.)"
    }
    if (calibWarn != "")
        Log("sweep warning | " calibWarn)

    ; ---- Phase 2: OCR the 12 board-border modifier tooltips ----
    if Running && BoardCalibrated() {
        ToolTip "Reading 12 board borders with Windows OCR..."
            . "`nThis can take 15-30 seconds on a 4K screen."
            . "`n(" KeyLabel(Keys["Abort"]) " to abort)"
        borderBlob := ScanBorders()
    }

    ; ---- Phase 3: one switch, one paste of the whole batch ----
    if Running && (copied > 0 || borderBlob != "") {
        payload := blob
        if (payload != "" && borderBlob != "")
            payload .= "`n"
        payload .= borderBlob
        A_Clipboard := payload
        ClipWait(1)
        WinActivate BrowserWinTitle
        if WinWaitActive(BrowserWinTitle, , 2) {
            Sleep ActivateDelay
            Send "^v"
            Sleep PasteDelay
        } else {
            Running := false
            Flash "Copied " copied " charts but couldn't focus the browser to paste.", 4000
            return
        }
    }

    Running := false
    ReleaseModifiers()
    Log("sweep done | sent " copied " charts | borders "
        . (borderBlob != "" ? "sent" : (BoardCalibrated() ? "FAILED" : "skipped")))
    borderNote := BoardCalibrated()
        ? (borderBlob != "" ? " + 12 border OCR scans" : " (border OCR failed)")
        : " (borders skipped: run the tray Setup wizard)"
    if (calibWarn != "") {
        Flash calibWarn (borderBlob != "" ? " (The 12 border scans WERE sent.)" : ""), 10000
        return
    }
    pageNote := (pages = 2) ? " from 2 pages"
        : " (2-page chart panel? Rerun the tray Setup wizard to add the page tabs)"
    Flash "Done. Sent " copied " charts" pageNote borderNote
        . "; skipped " skipped " empty/non-chart cells.", 6000
}
