@ECHO OFF

SET _EXAMPLES=%~p0
SET _ROOT=%_EXAMPLES%\..\..\..

:READ_FILES
FOR /F %%y in ('DIR /S /B %_ROOT%\*resource-graph.json') DO (
    CALL :ASDIR %%~dpy
)
GOTO :EOF

:ASDIR
    SET _DIR=%1%
    SET _DIR=%_DIR:~0,-1%
    CALL :WITHNAME %_DIR%
GOTO :EOF

:WITHNAME
    CALL :PROCESS %1 %~nx1
GOTO :EOF

:PROCESS
    SET _DIR=%1
    SET _NAME=%2
    SET GRAPH=%_DIR%\resource-graph.json
    SET YAML=%_DIR%\convert.yaml
    SET TXT_CONVERT=%_DIR%\convert.txt
    SET TXT_GRAPH=%_DIR%\graph
    ECHO Processing - %_NAME%
    node %_ROOT%/build/src/apps/convert.js %GRAPH% %YAML% > %TXT_CONVERT%
    node %_ROOT%/build/src/apps/graph.js %YAML% -f Internet -r -b -v > %TXT_GRAPH%.from.internet.txt
    node %_ROOT%/build/src/apps/graph.js %YAML% -f vm1/outbound -r -b -v > %TXT_GRAPH%.from.vm1.txt
    node %_ROOT%/build/src/apps/graph.js %YAML% -f vm2/outbound -r -b -v > %TXT_GRAPH%.from.vm2.txt
    node %_ROOT%/build/src/apps/graph.js %YAML% -f vm3/outbound -r -b -v > %TXT_GRAPH%.from.vm3.txt
    node %_ROOT%/build/src/apps/graph.js %YAML% -t vm1/inbound -r -b -v > %TXT_GRAPH%.to.vm1.txt
    node %_ROOT%/build/src/apps/graph.js %YAML% -t vm2/inbound -r -b -v > %TXT_GRAPH%.to.vm2.txt
    node %_ROOT%/build/src/apps/graph.js %YAML% -t vm3/inbound -r -b -v > %TXT_GRAPH%.to.vm3.txt
    node %_ROOT%/build/src/apps/graph.js %YAML% -t Internet -r -b -v > %TXT_GRAPH%.to.internet.txt
GOTO  :EOF
