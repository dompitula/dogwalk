@echo off
rem deploy.cmd: runs deploy.sh with Git Bash, for PowerShell and Command Prompt.
rem Typing "bash deploy.sh" there starts WSL instead of Git Bash.
rem Usage: deploy.cmd [options]   (the options of deploy.sh; see deploy.cmd --help)
setlocal

rem Git Bash sits next to git.exe: <Git>\cmd\git.exe -> <Git>\bin\bash.exe
set "GIT_BASH="
for %%G in (git.exe) do if not "%%~$PATH:G"=="" (
  if exist "%%~dp$PATH:G..\bin\bash.exe" set "GIT_BASH=%%~dp$PATH:G..\bin\bash.exe"
)
for %%D in ("%ProgramFiles%\Git" "%LocalAppData%\Programs\Git") do (
  if not defined GIT_BASH if exist "%%~D\bin\bash.exe" set "GIT_BASH=%%~D\bin\bash.exe"
)
if not defined GIT_BASH (
  echo deploy.cmd: Git Bash was not found. Install Git for Windows from https://git-scm.com/download/win, open a new terminal and run deploy.cmd again. 1>&2
  exit /b 1
)

pushd "%~dp0"
"%GIT_BASH%" deploy.sh %*
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
