# React Developer CLI

Wyspecjalizowane narzędzie do tworzenia aplikacji React z pomocą AI, TypeScript i Tailwind CSS.

## Czym jest React Developer CLI?

React Developer CLI to narzędzie wiersza poleceń, które pomaga inicjalizować projekty **React (Vite)** oraz **React Native/Expo** z przepływami pracy wspomaganymi przez AI. Generuje niestandardowe pliki komend dla Twojego asystenta AI (GitHub Copilot, Claude Code, Gemini CLI itp.), które prowadzą Cię przez ustrukturyzowany proces tworzenia aplikacji.

Narzędzie zapewnia krok po kroku workflow, który gwarantuje spójny i wysokiej jakości rozwój komponentów React (web) i ekranów React Native dzięki współpracy z AI.

## Instalacja

### Instalacja z Git

```bash
uv tool install react-developer --from https://github.com/Mil000D/react-developer.git
```

## Szybki Start

1. **Zainicjalizuj nowy projekt:**
   ```bash
   react-dev init moj-projekt-react                        # React web (domyślnie)
   react-dev init moj-projekt-mobile --type react-native   # React Native / Expo
   ```

2. **Wybierz asystenta AI** gdy zostaniesz o to poproszony (lub określ flagą `--ai`)

3. **Rozpocznij tworzenie** używając wygenerowanych komend AI w swoim preferowanym asystencie
4. **Dla Expo:** po instalacji zależności uruchom `npx expo start` (lub `npm run android` / `npm run ios`) i zeskanuj kod QR w aplikacji Expo Go

## Tworzenie Nowego Projektu

### Podstawowa komenda

```bash
react-dev init <nazwa-projektu> [OPCJE]
```

### Przykłady użycia

```bash
# Utwórz nowy projekt z domyślnymi ustawieniami
react-dev init moja-aplikacja

# Inicjalizuj w bieżącym katalogu
react-dev init . --ai claude

# Inicjalizuj z konkretnym asystentem AI
react-dev init moja-aplikacja --ai copilot

# Pomiń inicjalizację git
react-dev init moja-aplikacja --no-git

# Wymuś scalenie z istniejącym katalogiem
react-dev init --here --force

# Utwórz projekt mobilny (React Native/Expo)
react-dev init moja-aplikacja --type react-native --ai copilot
```

### Dostępne opcje

- `--type <react|react-native>`: Wybierz typ projektu (React web lub React Native/Expo)
- `--ai <asystent>`: Wybierz asystenta AI (copilot, claude, gemini, qwen, opencode, codex, windsurf, roo, amp)
- `--here`: Inicjalizuj w bieżącym katalogu zamiast tworzyć nowy folder
- `--force`: Pomiń potwierdzenie przy scalaniu z istniejącym katalogiem
- `--no-git`: Pomiń inicjalizację repozytorium git
- `--ignore-agent-tools`: Pomiń sprawdzanie narzędzi CLI asystenta AI
- `--github-token <token>`: Token GitHub dla zapytań API

### Sprawdzenie wymagań systemowych

```bash
react-dev check
```

Weryfikuje, czy wymagane narzędzia są zainstalowane i pokazuje dostępnych asystentów AI.


## Jak Używać Komend AI

Komendy działają zarówno dla projektów React (web), jak i React Native/Expo. W przypadku Expo generowane są ekrany w `app/(tabs)/` z routowaniem przez `expo-router` oraz rejestracją w `shared/utils/pageDiscovery.ts`.

Po zainicjalizowaniu projektu, narzędzie wygeneruje komendy AI dla wybranego asystenta. Oto jak z nich korzystać:

### Krok 1: Tworzenie Prototypu HTML
```
/react-prototype-creator
```
**Co robi:**
- Tworzy prototyp HTML z Tailwind CSS na podstawie mockupu lub opisu
- Usuwa stare prototypy z folderu `prototypes/`
- Zapisuje nowy prototyp jako punkt wyjścia do rozwoju
- Używa tylko HTML i Tailwind CSS (bez JavaScript)

**Kiedy używać:** Na samym początku, gdy masz mockup lub opis UI do zaimplementowania

### Krok 2: Analiza Wymagań
```
/react-requirements-creator
```
**Co robi:**
- Analizuje prototypy HTML z folderu `prototypes/`
- Tworzy szczegółową specyfikację implementacji
- Zapisuje wymagania do folderu `requirements/`
- Definiuje typy, hooki, serwisy i strukturę komponentów

**Kiedy używać:** Po utworzeniu prototypu HTML, przed implementacją TypeScript

### Krok 3: Implementacja TypeScript
```
/react-typescript-developer
```
**Co robi:**
- Implementuje logikę TypeScript i typy
- Tworzy niestandardowe hooki i serwisy
- Obsługuje pobieranie danych i zarządzanie stanem
- Czyta z plików wymagań utworzonych w Kroku 1

**Kiedy używać:** Po utworzeniu wymagań, przed tworzeniem komponentów

### Krok 4: Kompletna Implementacja Strony
```
/react-page-developer
```
**Co robi:**
- Buduje kompletne strony React
- Łączy wiele komponentów
- Implementuje logikę na poziomie strony i routing
- Tworzy pełne strony aplikacji
- W projektach Expo generuje ekrany React Native w `app/(tabs)/`, stylowane przez `StyleSheet` i korzystające z `useThemeColors()`

**Kiedy używać:** Do tworzenia kompletnych stron lub widoków aplikacji

### Utrzymanie i Konfiguracja (Opcjonalne)

Poniższe komendy są pomocnicze i można ich używać w dowolnym momencie rozwoju projektu.

#### Aktualizacje i Modyfikacje
```
/react-page-updater
```
**Co robi:**
- Aktualizuje istniejące strony i komponenty
- Modyfikuje funkcjonalność zachowując strukturę
- Obsługuje skoordynowane zmiany UI i logiki

#### Dodawanie Języków
```
/react-language-creator
```
**Co robi:**
- Dodaje nowe języki do projektu
- Automatycznie wykrywa istniejące przestrzenie nazw (namespaces)
- Generuje poprawne pliki tłumaczeń w oparciu o strukturę języka referencyjnego

#### Tworzenie Motywów
```
/react-theme-creator
```
**Co robi:**
- Tworzy kompleksowe definicje motywów (kolory, style)
- Generuje palety kolorów (12 odcieni)
- Dodaje motyw do konfiguracji aplikacji

## Przykładowy Przepływ Pracy

1. **Utwórz nowy projekt:**
   ```bash
   react-dev init sklep-internetowy --ai copilot
   cd sklep-internetowy
   ```

2. **Otwórz projekt w edytorze kodu** (VS Code, Cursor, itp.)

3. **Użyj komend AI w kolejności:**
   - `/react-prototype-creator` - Stwórz prototyp HTML na podstawie mockupu strony produktu
   - `/react-requirements-creator` - Przeanalizuj prototyp i określ wymagania
   - `/react-typescript-developer` - Utwórz typy i serwisy dla produktów
   - `/react-page-developer` - Stwórz kompletną stronę listy produktów

4. **Testuj i iteruj** używając `/react-page-updater` gdy potrzebne są zmiany

5. **Konfiguracja (Opcjonalnie):**
   - `/react-language-creator` - Dodaj kolejne języki (np. niemiecki, hiszpański)
   - `/react-theme-creator` - Stwórz unikalny motyw dla swojego sklepu

### Przykład dla React Native / Expo

1. **Utwórz nowy projekt mobilny:**
   ```bash
   react-dev init sklep-mobile --type react-native --ai copilot
   cd sklep-mobile
   npm install
   npx expo start   # lub npm run android / npm run ios
   ```

2. **Użyj komend AI w kolejności:**
   - `/react-prototype-creator` - Prototyp ekranu w `prototypes/`
   - `/react-requirements-creator` - Wymagania na podstawie prototypu
   - `/react-typescript-developer` - Logika/serwisy współdzielone w `shared/`
   - `/react-page-developer` - Ekrany React Native w `app/(tabs)/`

3. **Dodaj stronę do nawigacji** rejestrując ją w `shared/utils/pageDiscovery.ts` (oraz ukryj w `app/(tabs)/_layout.tsx` gdy ma być tylko w sidebarze)

## Wspierani Asystenci AI

| Asystent | Narzędzie CLI | Struktura Folderów | Format Pliku |
|----------|---------------|-------------------|--------------|
| **GitHub Copilot** | Wbudowane w IDE | `.github/prompts/` | `.prompt.md` |
| **Claude Code** | `claude` | `.claude/commands/` | `.md` |
| **Gemini CLI** | `gemini` | `.gemini/commands/` | `.toml` |
| **Qwen Code** | `qwen` | `.qwen/commands/` | `.toml` |
| **OpenCode** | `opencode` | `.opencode/command/` | `.md` |
| **Codex CLI** | `codex` | `.codex/prompts/` | `.md` |
| **Windsurf** | Wbudowane w IDE | `.windsurf/workflows/` | `.md` |
| **Roo Code** | Wbudowane w IDE | `.roo/commands/` | `.md` |
| **Amp** | `amp` | `.agents/commands/` | `.md` |



## Struktura Projektu

Po inicjalizacji, Twój projekt będzie miał (React web):

```
moj-projekt-react/
├── requirements/           # Specyfikacje implementacji
├── prototypes/             # Prototypy HTML
├── src/
│   ├── components/         # Komponenty React
│   ├── hooks/              # Niestandardowe hooki
│   ├── services/           # Serwisy API
│   ├── types/              # Definicje TypeScript
│   └── utils/              # Funkcje narzędziowe
├── .github/prompts/       # Komendy asystenta AI (dla Copilot)
├── .claude/commands/      # Komendy asystenta AI (dla Claude)
└── package.json           # Zależności Node.js
```

Struktura dla React Native / Expo:

```
moj-projekt-expo/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx     # Konfiguracja zakładek
│   │   ├── index.tsx       # Dashboard/Home
│   │   └── settings.tsx    # Ekran ustawień + Twoje ekrany
│   └── _layout.tsx         # Root layout (Stack + Sidebar)
├── components/             # Wspólne komponenty UI
├── context/                # ThemeContext, SidebarContext
├── locales/                # i18n (en/pl)
├── shared/
│   └── utils/pageDiscovery.ts # Rejestr stron dla sidebaru
├── prototypes/             # Prototypy do analizy
├── requirements/           # Specyfikacje funkcjonalne
├── app.json
└── package.json
```

## Wymagania Systemowe

- **Python**: 3.11 lub wyższy
- **Git**: Do kontroli wersji (opcjonalne, ale zalecane)
- **Asystent AI**: Jeden z wspieranych asystentów (opcjonalne, ale zalecane)
- **React Native/Expo**: Expo Go lub emulator (Android Studio / Xcode) do uruchamiania aplikacji mobilnej

## Rozwiązywanie Problemów

### Częste Problemy

1. **Nie znaleziono asystenta AI**
   ```bash
   react-dev check  # Zweryfikuj instalację
   react-dev init --ignore-agent-tools  # Pomiń sprawdzanie CLI
   ```

2. **Błędy uprawnień**
   ```bash
   # Na systemach Unix, upewnij się o uprawnieniach wykonywania
   chmod +x .specify/scripts/*.sh
   ```

3. **Niepowodzenie inicjalizacji Git**
   ```bash
   react-dev init moj-projekt --no-git  # Pomiń konfigurację git
   ```

### Pomoc

- Uruchom `react-dev --help` aby zobaczyć opcje komend
- Uruchom `react-dev check` aby zweryfikować wymagania systemowe
- Sprawdź [repozytorium GitHub](https://github.com/github/spec-kit) aby znaleźć problemy i dokumentację

## Wskazówki dla Początkujących

1. **Zacznij od małego projektu** - Przetestuj narzędzie na prostej stronie lub komponencie
2. **Używaj komend kolejno** - Nie pomijaj kroków w workflow
3. **Czytaj wygenerowane pliki wymagań** - Pomogą Ci zrozumieć strukturę projektu
4. **Eksperymentuj z różnymi asystentami AI** - Każdy ma swoje mocne strony
5. **Zachowuj kopie zapasowe** - Używaj git do śledzenia zmian

## Licencja

Ten projekt jest licencjonowany zgodnie z warunkami określonymi w pliku LICENSE.
