@echo off
:: ============================================================
::  gitstatus.bat - shows pending files in a git project
::
::  Usage:  gitstatus [path] [-o] [-i N] [-f]
::    path   project folder (default: current folder)
::    -o     Online watch - refresh every N sec until ESC
::    -i N   refresh interval in seconds (default 3)
::    -f     fetch remote before each refresh
:: ============================================================
setlocal EnableDelayedExpansion
chcp 65001 >nul

set "PROJ="
set "WATCH=0"
set "FETCH=0"
set "INTERVAL=3"

:: ---------- args ----------
:parse
if "%~1"=="" goto parsed
if /i "%~1"=="-o" goto arg_watch
if /i "%~1"=="--online" goto arg_watch
if /i "%~1"=="-f" goto arg_fetch
if /i "%~1"=="-i" goto arg_interval
set "PROJ=%~1"
shift
goto parse

:arg_watch
set "WATCH=1"
shift
goto parse

:arg_fetch
set "FETCH=1"
shift
goto parse

:arg_interval
set "INTERVAL=%~2"
shift
shift
goto parse

:parsed
if "%PROJ%"=="" set "PROJ=%CD%"

if not exist "%PROJ%" (
    echo [ERROR] Folder not found: %PROJ%
    exit /b 1
)

pushd "%PROJ%"

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Not a git repository: %PROJ%
    popd
    exit /b 1
)

:: ---------- run ----------
if "%WATCH%"=="0" (
    call :show
    goto done
)

:: ANSI escape char (Windows 10+) - for in-place cursor control
for /f %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set "CUR=%TEMP%\gitstatus_%RANDOM%_cur.txt"
set "PREV=%TEMP%\gitstatus_%RANDOM%_prev.txt"
set "CHANGED=--:--:--"
type nul > "%PREV%"
cls

:loop
call :show > "%CUR%"
fc /b "%CUR%" "%PREV%" >nul 2>&1
if errorlevel 1 (
    rem changed: cursor home, overwrite, clear leftovers
    <nul set /p "=%ESC%[H%ESC%[J"
    type "%CUR%"
    echo.
    copy /y "%CUR%" "%PREV%" >nul
    set "CHANGED=!TIME:~0,8!"
)
:: footer only - updated in place on the same line
<nul set /p "=%ESC%[G%ESC%[K [ONLINE] changed !CHANGED! | checked !TIME:~0,8! | every %INTERVAL%s | ESC to exit"
call :wait_esc %INTERVAL%
if errorlevel 1 goto stop
goto loop

:stop
echo.
del "%CUR%" "%PREV%" >nul 2>&1

:done
popd
endlocal
exit /b 0


:: ============================================================
::  :wait_esc N  - waits N seconds, returns 1 if ESC pressed
:: ============================================================
:wait_esc
powershell -NoProfile -Command "$t=(Get-Date).AddSeconds(%1); while((Get-Date) -lt $t){ if([Console]::KeyAvailable){ if([Console]::ReadKey($true).Key -eq 'Escape'){ exit 1 } }; Start-Sleep -Milliseconds 100 }; exit 0"
exit /b %errorlevel%


:: ============================================================
::  :show  - prints the full status once
:: ============================================================
:show
if "%FETCH%"=="1" git fetch --prune --quiet 2>nul

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%b"
for /f "delims=" %%r in ('git rev-parse --show-toplevel') do set "ROOT=%%r"

set "HAS_UP=1"
git rev-parse --abbrev-ref --symbolic-full-name @{u} >nul 2>&1
if errorlevel 1 set "HAS_UP=0"

echo.
echo ============================================================
echo  Project : %ROOT%
echo  Branch  : %BRANCH%
if "%HAS_UP%"=="0" (
    echo  Remote  : [no upstream]
) else (
    for /f "tokens=1,2" %%a in ('git rev-list --left-right --count HEAD...@{u}') do (
        echo  Remote  : %%a to push ^| %%b to pull
    )
)
echo ============================================================

echo.
echo [STAGED - ready to commit]
set "N=0"
for /f "delims=" %%f in ('git -c core.quotepath^=off diff --cached --name-status') do (
    echo    %%f
    set /a N+=1
)
if !N!==0 echo    (none)

echo.
echo [MODIFIED - not staged]
set "N=0"
for /f "delims=" %%f in ('git -c core.quotepath^=off diff --name-status') do (
    echo    %%f
    set /a N+=1
)
if !N!==0 echo    (none)

echo.
echo [UNTRACKED - new files]
set "N=0"
for /f "delims=" %%f in ('git -c core.quotepath^=off ls-files --others --exclude-standard') do (
    echo    %%f
    set /a N+=1
)
if !N!==0 echo    (none)

if "%HAS_UP%"=="0" exit /b 0

echo.
echo [COMMITS - not pushed]
set "N=0"
for /f "delims=" %%c in ('git log @{u}..HEAD --oneline') do (
    echo    %%c
    set /a N+=1
)
if !N!==0 echo    (none)

echo.
echo [COMMITS - incoming, not pulled]
set "N=0"
for /f "delims=" %%c in ('git log HEAD..@{u} --oneline') do (
    echo    %%c
    set /a N+=1
)
if !N!==0 echo    (none)
exit /b 0