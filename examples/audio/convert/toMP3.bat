for %%i in (*.wav) do (
ffmpeg -i %%i -acodec mp3 -n %%~ni.mp3
)
