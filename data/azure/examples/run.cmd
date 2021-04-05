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

:ROUTE 
    SHIFT
    SET FROM_NODE=%~0
    SHIFT
    SET TO_NODE=%~0
    SHIFT
    SET ROUTE_NAME=%0
    SET ROUTE_FLAGS=%1 %2 %3 %4 %5 %6 %7 %8
    node %_ROOT%/build/src/apps/graph.js %YAML% -f %FROM_NODE% %ROUTE_FLAGS% > %TXT_GRAPH%.from.%ROUTE_NAME%.txt
    node %_ROOT%/build/src/apps/graph.js %YAML% -t %TO_NODE% %ROUTE_FLAGS% > %TXT_GRAPH%.to.%ROUTE_NAME%.txt
GOTO :EOF

:DEFAULT_ROUTES
    CALL :ROUTE Internet Internet internet -r -b -v
    CALL :ROUTE "vm1/outbound" "vm1/inbound" vm1 -r -b -v
    CALL :ROUTE "vm2/outbound" "vm2/inbound" vm2 -r -b -v
    CALL :ROUTE "vm3/outbound" "vm3/inbound" vm3 -r -b -v
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
    CALL :DEFAULT_ROUTES
GOTO  :EOF
