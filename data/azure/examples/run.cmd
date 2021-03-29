@ECHO OFF

:READ_FILES
FOR /F %%y in ('DIR /S /B resource-graph.json') DO (
    CALL :ASDIR %%~dpy
)
GOTO :EOF

:ASDIR
    SET _DIR=%1%
    SET _DIR=%_DIR:~0,-1%
    CALL :WITHNAME %_DIR%
GOTO :EOF

:WITHNAME
    CALL :PROCESS %1 %~n1
GOTO :EOF

:PROCESS
    SET _DIR=%1
    SET _NAME=%2
    SET GRAPH=%_DIR%\resource-graph.json
    SET YAML=%_DIR%\convert.yaml
    SET TXT_CONVERT=%_DIR%\convert.txt
    SET TXT_GRAPH=%_DIR%\graph
    ECHO Processing - %_NAME%
    node ../../../build/src/apps/convert.js %GRAPH% %YAML% > %TXT_CONVERT%
    node ../../../build/src/apps/graph.js %YAML% -f Internet -r -b -v > %TXT_GRAPH%.internet.txt
    node ../../../build/src/apps/graph.js %YAML% -f AzureBackbone/inbound -r -b -v > %TXT_GRAPH%.backbone.txt
GOTO  :EOF
