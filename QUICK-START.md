# React Developer CLI - Szybki Start

## 1. Instalacja narzędzia

```bash
uv tool install react-developer --from git+https://gitlab.pwo.assecods.pl/architektura/ai/react-developer.git
```

## 2. Inicjalizacja nowego projektu

```bash
react-dev init moja-aplikacja --ai roo
cd moja-aplikacja
```
Wejdź do projektu w nowym oknie w VsCodzie

**React Native / Expo (mobile)**

```bash
react-dev init moja-aplikacja --type react-native --ai roo
cd moja-aplikacja
npm install
npx expo start   # lub npm run android / npm run ios / npm run web
```
Skanuj kod QR w aplikacji Expo Go lub uruchom emulator/simulator.

## 3. Przepływ pracy - 4 kroki

Te same komendy działają dla projektów React (web) i React Native/Expo.

### Krok 1: Stwórz prototyp HTML (Prototype Creator)

**W swoim asystencie AI (np. GitHub Copilot, Roo Code):**

```
/react-prototype-creator
```

**Co musisz zrobić:**
1. Wstaw zrzut ekranu/mockup swojego interfejsu
2. Poproś asystenta: 
   > "Na podstawie tego mockupu, stwórz prototyp HTML używając tylko HTML i Tailwind CSS. Zapisz w `prototypes/nazwa-strony.html`"

**Komenda automatycznie:**
- Usunie stare prototypy z folderu `prototypes/`
- Stworzy nowy plik `.html` z czystym HTML + Tailwind CSS
- Nie doda żadnego JavaScript

### Krok 2: Analiza wymagań (Requirements Creator)

Użyj komendy w swoim asystencie AI (np. Roo Code):

```
/react-requirements-creator
```

**Co zrobi:** 
- Przeanalizuje Twój prototyp HTML z `prototypes/`
- Stworzy szczegółową specyfikację w `requirements/`
- Zdefiniuje typy TypeScript, hooki i strukturę komponentów

**Przykład:** Podaj ścieżkę do prototypu: `prototypes/user-list.html`

### Krok 3: Implementacja TypeScript (TypeScript Developer)

```
/react-typescript-developer
```

**Co zrobi:**
- Zaimplementuje typy TypeScript
- Stworzy custom hooki (useState, useEffect, itp.)
- Napisze serwisy do komunikacji z API
- Obsłuży logikę biznesową

**AI stworzy pliki jak:** `src/types/`, `src/hooks/`, `src/services/`

### Krok 4: Implementacja komponentów React (Page Developer)

```
/react-page-developer
```

**Co zrobi:**
- Stworzy komponenty React z Tailwind CSS (dla Expo wygeneruje ekrany React Native)
- Zintegruje hooki i typy z poprzednich kroków
- Wygeneruje gotową stronę/komponent

## 4. React Native / Expo – najważniejsze różnice

- Struktura projektu: folder `app/(tabs)/` z routowaniem przez `expo-router`
- Komponenty UI korzystają z prymitywów React Native (`View`, `Text`, `ScrollView`) i `StyleSheet`
- Kolory pobieraj z `useThemeColors()` zamiast wpisywać na sztywno
- Każdą nową stronę rejestruj w `shared/utils/pageDiscovery.ts` oraz (gdy ma być tylko w sidebarze) ukryj w `app/(tabs)/_layout.tsx` przez `href: null`
- Uruchamianie: `npx expo start` (QR w Expo Go) lub `npm run android` / `npm run ios` na emulatorze
