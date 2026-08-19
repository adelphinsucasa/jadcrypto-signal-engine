@echo off
REM ============================================================
REM JadCrypto Signal Engine - Mobile App Setup
REM Paso 1: Crear proyecto React Native + TypeScript para Android
REM ============================================================

cd /d "C:\Desarrollos\jadcrypto signal engine\jadcrypto-signal-engine\mobile"

REM La plantilla oficial (@react-native-community/cli) ya incluye TypeScript
REM por defecto desde RN 0.71+. Nombre interno del proyecto: JadCryptoMobile
npx @react-native-community/cli@latest init JadCryptoMobile --skip-install

REM Instalar dependencias (incluye TS, tipos de RN, navigation, etc.)
cd JadCryptoMobile
npm install

REM Dependencias clave para overlay + alertas + audio +振動 + storage
npm install react-native-system-alert-window react-native-sound react-native-vibration @react-navigation/native @react-navigation/native-stack @react-native-async-storage/async-storage axios date-fns

REM Soporte de TS ya viene con la plantilla; añadimos tipos auxiliares
npm install -D @types/react-native-sound

echo.
echo Proyecto JadCryptoMobile creado correctamente en mobile/JadCryptoMobile
echo Siguiente paso: crear estructura src/ (types, mocks, screens, components, services)
pause
