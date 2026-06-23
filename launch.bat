@echo off
title Lidium Server Console

cd /d "%~dp0"

set "JAVA_HOME=C:\Program Files\Zulu\zulu-16"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "CLASSPATH=.;dist\Lidium.jar;lib\*;lib\graal\*"

java ^
  -server ^
  -Dfile.encoding=UTF-8 ^
  -Dpolyglot.engine.WarnInterpreterOnly=false ^
  -Dnet.sf.odinms.wzpath=wz\ ^
  -cp "%CLASSPATH%" ^
  server.Start

pause
