del images.json
setlocal enabledelayedexpansion
echo { >> images.json
for /R %%i in (*.png) do (
if defined M echo !M! >> images.json
set B=%%i
set C=!B:%CD%\=!
set D=!C:\=/%!
set E=!D:image/=%!
<NUL set /p= ""%%~ni": "!E!"" >> images.json
set M=,
)
echo } >> images.json