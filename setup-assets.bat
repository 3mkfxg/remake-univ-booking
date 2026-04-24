 @echo off
chcp 65001 >nul 2>&1
echo ===================================
echo  IU Booking System - Asset Setup
echo ===================================
echo.

set "SRC=C:\Users\fawzi\.gemini\antigravity\brain\c34cb454-b31b-47a8-9fda-3b4e310f2cc1"
set "DEST=%~dp0assets"

echo Creating directories...
if not exist "%DEST%" mkdir "%DEST%"
if not exist "%DEST%\fields" mkdir "%DEST%\fields"

echo Copying logo...
copy /Y "%SRC%\iu_logo_1776986115495.png" "%DEST%\logo.png"

echo Copying padel court...
copy /Y "%SRC%\padel_court_1776986135818.png" "%DEST%\fields\padel.jpg"

echo Copying football 5v5...
copy /Y "%SRC%\football5_field_1776986153406.png" "%DEST%\fields\football5.jpg"

echo Copying football 6v6...
copy /Y "%SRC%\football6_field_1776986214605.png" "%DEST%\fields\football6.jpg"

echo Copying squash court...
copy /Y "%SRC%\squash_court_1776986226418.png" "%DEST%\fields\squash.jpg"

echo Copying multi-purpose court...
copy /Y "%SRC%\multi_court_1776986240307.png" "%DEST%\fields\multi.jpg"

echo Copying beach court...
copy /Y "%SRC%\beach_court_1776986254761.png" "%DEST%\fields\beach.jpg"

echo Copying hero image...
copy /Y "%SRC%\field_hero_1776986268090.png" "%DEST%\fields\field_hero.jpg"

echo.
echo ===================================
echo  Done! All assets copied.
echo ===================================
echo.
pause
