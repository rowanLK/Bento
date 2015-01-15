md assets
cd assets
md audio
cd ..
del filelist.txt
echo { >> filelist.txt
for %%i in (*.mp3) do (
ffmpeg -i %%i -acodec libvorbis -ab 128k -y assets/audio/%%~ni.ogg
ffmpeg -i %%i -acodec ac3 -ab 128k -y assets/audio/%%~ni.ac3
ffmpeg -i %%i -ab 128k -y assets/audio/%%~ni.mp3
echo %%~ni: ['%%i', '%%~ni.ogg', '%%~ni.ac3'], >> filelist.txt
)
echo } >> filelist.txt
pause