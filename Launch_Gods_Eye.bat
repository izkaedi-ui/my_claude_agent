@echo off
color 0b
title GODS EYE TERMINAL LINK

echo [///] SYNCHRONIZING WITH OMEGA PROTOCOL...
:: BONUS #1: CYBERNETIC AI VOICE GREETING
powershell -c "Add-Type -AssemblyName System.speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Rate = 1; $synth.SelectVoiceByHints('Female'); $synth.Speak('Omega Protocol engaged. Gods Eye neural link established. Welcome back, Architect.');"

echo [+] BOOTING TELEMETRY PYTHON EMITTER (PORT 8080)...
start "GODS EYE: TELEMETRY SOCKET" cmd /c "cd /d H:\agents && title TELEMETRY ENGINE && python gods_eye_emitter.py"

echo [+] BOOTING NODE MONOLITHIC TELEMETRY & WEB SERVER (PORT 9092)...
start "GODS EYE: MONOLITH ROUTER" cmd /c "cd /d H:\agents\gods-eye && title NODE MONOLITH && node telemetry_socket.mjs"

echo [+] BOOTING TARTARUS JIT-IR X-RAY DEMON...
start "GODS EYE: TARTARUS BRIDGE" cmd /c "cd /d H:\agents\gods-eye && title TARTARUS JIT-IR && python tartarus_bridge.py"

echo [///] GODS EYE MONOLITH ENGINE ONLINE. ROUTING TO LOCALHOST...
:: Let Node server boot up before pinging the browser
ping -n 5 127.0.0.1 >nul

:: AUTO-CONNECT TO MONOLITH HOST
start http://localhost:9092

exit
