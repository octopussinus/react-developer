# Opening the app in Expo Go on an Android emulator

All of this runs headless -- no window needed.

```bash
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Android/Sdk}
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator

emulator -list-avds                       # pick one
adb devices | grep -q emulator || \
  nohup emulator -avd <name> -no-window -no-audio -no-boot-anim \
    -gpu swiftshader_indirect -memory 4096 >/tmp/emulator.log 2>&1 &
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
```

Start Metro on a free port and open the app in Expo Go. The first time, Expo
CLI installs the Expo Go version matching this SDK:

```bash
CI=1 npx expo start --android --port 8090 > /tmp/metro.log 2>&1 &
```

Re-opening later (fresh JS, no stale error screen):

```bash
adb shell am force-stop host.exp.exponent
adb reverse tcp:8090 tcp:8090
adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8090" host.exp.exponent
```

A specific screen -- the app's scheme is in `app.json`:

```bash
adb shell am start -a android.intent.action.VIEW \
  -d "exp://127.0.0.1:8090/--/orders/1" host.exp.exponent
```

Evidence:

```bash
adb exec-out screencap -p > /tmp/screen.png     # look at it
grep -E "ERROR|Uncaught|WARN" /tmp/metro.log     # read every one
```

Stop only what you started: kill the Metro process by its PID, not by name --
the user may have their own `npm start` running.
