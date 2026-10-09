# Aplikacja na telefon — zacznij tutaj

**Dla osoby, która ma już stronę zrobioną w react-dev** i chce z niej zrobić
aplikację na telefon (iPhone i Android). Nie będziesz pisać kodu. Będziesz
wpisywać krótkie komendy i odpowiadać na pytania.

English version: [INSTRUCTION-MOBILE.md](INSTRUCTION-MOBILE.md) · Instrukcja do
samej strony: [INSTRUKCJA.md](INSTRUKCJA.md)

---

## Co to właściwie jest

Twoja strona zostaje taka, jaka jest. Obok niej powstaje **osobny folder** z
aplikacją na telefon, zbudowaną w **Expo**. Folder strony jest tylko czytany —
nic w nim się nie zmienia.

Dzieje się to w dwóch etapach:

1. **Kopiowanie.** Jedna komenda przenosi wszystko, co działa na telefonie bez
   zmian: dane, połączenia z serwerem, reguły formularzy, tłumaczenia, kolory i
   motywy, nawet testy. W prawdziwym projekcie to setki plików w kilka sekund.
   Każda podstrona strony dostaje swój ekran w aplikacji.
2. **Przepisywanie ekranów.** To, co rysuje ekran, trzeba przepisać na telefon.
   Robi to asystent — po jednym pliku, albo kilku asystentów naraz.

Ekrany, które nie są jeszcze przepisane, pokazują kartę **„Not ported yet"**.
Aplikacja nigdy się przez nie nie wysypuje.

---

## Słowa, które zobaczysz

| Słowo                    | Co znaczy                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| **Expo Go**              | Darmowa aplikacja na telefon. Skanujesz nią kod QR i widzisz swoją aplikację bez instalowania jej. |
| **Port** (przeniesienie) | Kopiowanie strony do aplikacji mobilnej. Robi to komenda `npm run port`.                           |
| **PORT.md**              | Lista tego, co zostało do przepisania, w kolejności. Tworzy się sama — nie edytuj jej.             |
| **Ekran**                | To, czym na stronie jest podstrona.                                                                |
| **Fala**                 | Jedna runda pracy kilku asystentów naraz. Po każdej fali wszystko jest sprawdzane i zapisywane.    |
| **Commit**               | Zapisany punkt w historii projektu, do którego zawsze można wrócić.                                |

---

## Część 0 — jednorazowe przygotowanie

**1. Musisz mieć działającą stronę z react-dev** i wszystko z Części 0 głównej
instrukcji ([INSTRUKCJA.md](INSTRUKCJA.md)): Node.js, `react-dev`, asystenta.

**2. Zainstaluj Expo Go na telefonie.** W Sklepie Play albo App Store wyszukaj
„Expo Go".

- **Android:** wszystko zadziała od razu — właściwą wersję Expo Go podpowie Ci
  sam komputer.
- **iPhone:** Expo Go w App Store bywa przez jakiś czas o wersję starsze niż ta
  aplikacja (Expo SDK 57). Jeśli telefon pisze, że projekt jest niezgodny, zajrzyj
  do pliku `README.md` w folderze aplikacji mobilnej — jest tam opisane, co zrobić.

**3. Zaktualizuj react-dev**, jeśli instalowałeś go dawno:

```
uv tool install react-developer --reinstall --from https://github.com/octopussinus/react-developer.git
```

---

## Część 1 — stwórz aplikację mobilną

Wszystko wpisujesz w Terminalu. Zamiast `mojastrona` wpisz nazwę folderu swojej
strony.

**1. Wejdź do folderu strony:**

```
cd mojastrona
```

**2. Utwórz aplikację mobilną obok niej:**

```
react-dev init ../mojastrona-mobile --type react-native --from .
```

Kropka na końcu znaczy „z tego folderu". Aplikacja powstaje **obok** strony,
nigdy w środku.

**3. Wejdź do niej:**

```
cd ../mojastrona-mobile
```

**4. Pobierz potrzebne części.** Kilka minut, dużo tekstu — tak ma być.

```
npm install
```

**5. Przenieś stronę:**

```
npm run port
```

Na końcu zobaczysz podsumowanie: ile plików skopiowano, ile zostało do
przepisania i ile ekranów już działa (na początku 0 — to normalne).

**6. Jeszcze raz pobierz części** — przeniesienie dopasowało wersje do strony:

```
npm install
```

**7. Sprawdź, czy nic nie jest zepsute:**

```
npm run verify
```

Jeśli ostatnia linijka nie jest błędem, wszystko jest zdrowe.

**8. Zapisz ten stan:**

```
git add -A
git commit -m "aplikacja mobilna: pierwsze przeniesienie"
```

---

## Część 2 — zobacz ją na telefonie

```
npm start
```

Na ekranie pojawi się kod QR. Zeskanuj go aplikacją **Expo Go** (na iPhonie —
zwykłym aparatem). Telefon i komputer muszą być w tej samej sieci Wi-Fi.

**Telefon nie może się połączyć?** Zatrzymaj komendę (Ctrl+C) i wpisz zamiast niej:

```
npx expo start --tunnel
```

Na początku każdy ekran pokazuje kartę „Not ported yet". To normalne — czas je
przepisać.

---

## Część 3 — przepisywanie ekranów

Otwórz asystenta **w folderze aplikacji mobilnej** (nie strony):

```
claude
```

Są dwa sposoby. Możesz je mieszać.

### Sposób A — po kolei, widzisz każdy krok

```
/react-native-port
```

Asystent czyta `PORT.md` i przepisuje kolejny plik albo ekran. Zaczyna od
plików, które odblokowują najwięcej — czasem jeden mały plik przenosi za sobą
setki innych. Wpisuj tę komendę ponownie, żeby szedł dalej, albo powiedz mu:
_„rób dalej, aż PORT.md będzie pusty; zatrzymaj się tylko, gdy potrzebujesz mojej
decyzji"_.

### Sposób B — kilku asystentów naraz, szybciej

```
/react-native-parallel
```

Asystent najpierw sprawdza, czy wszystko jest zapisane i zdrowe, a potem
**zapyta Cię**:

- którym asystentem pracować (Claude Code, Codex albo Gemini — który masz),
- ilu ich ma być naraz i po ile plików każdy,
- czy zrobić jedną falę na próbę, czy iść do końca.

**Zacznij od jednej fali** i obejrzyj wynik na telefonie. Każdy asystent w tle to
płatne uruchomienie (z Claude mniej więcej $0.50–2 za falę kilku plików).

Po każdej fali wszystko jest sprawdzane i zapisywane jako commit, więc nic
niedokończonego nie wchodzi. Pracę każdego asystenta widać w folderze
`.ai/runs/`.

To samo możesz uruchomić sam, bez asystenta:

```
react-dev dispatch --dry-run
react-dev dispatch --limit 3 --files 3 --waves 1
```

`--dry-run` pokazuje plan i nic nie uruchamia. `--agent gemini` albo
`--agent codex` wybiera innego asystenta.

### Decyzje, które należą do Ciebie

Czasem asystent trafi na coś, czego nie wolno mu zdecydować samemu — na przykład
jak ma działać mapa na telefonie. Wtedy zatrzymuje się na tym jednym pliku i
pyta Ciebie. Odpowiadasz, on kończy.

### Sprawdzanie

Po każdym przepisanym ekranie:

```
/react-native-verify
```

Uruchamia wszystkie kontrole i, jeśli to możliwe, otwiera ekran w Expo Go.

---

## Część 4 — gdy strona się zmieni

Zmieniłeś coś na stronie? W folderze aplikacji mobilnej:

```
npm run port
```

- Skopiowane pliki same się aktualizują.
- Ekran już przepisany zostaje oznaczony jako **nieaktualny** (stale), jeśli
  zmieniła się strona, z której powstał. Asystent przeniesie zmianę przy
  następnym `/react-native-port`.
- Plik zmieniony **i** na stronie, **i** w aplikacji jest oznaczony jako
  **rozbieżny** (diverged) — tu decydujesz Ty.

---

## Część 5 — kiedy Expo Go przestanie wystarczać

Expo Go zawiera określony zestaw funkcji telefonu. Jeśli aplikacja potrzebuje
czegoś spoza niego (płatności, mapy z własnym kluczem, inne natywne biblioteki),
przechodzisz na **development build** — własną wersję Expo Go. Kod się nie
zmienia. Polecenia są w `README.md` w folderze aplikacji mobilnej.

---

## Gdy coś pójdzie nie tak

| Co widzisz                                      | Co zrobić                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `npm run verify` jest czerwone                  | Wpisz `/react-native-verify` i poproś asystenta o naprawę.              |
| Telefon nie łączy się z komputerem              | `npx expo start --tunnel`                                               |
| „Project is incompatible with this Expo Go"     | Inna wersja Expo Go — zajrzyj do `README.md` aplikacji mobilnej.        |
| `react-dev dispatch` mówi „Uncommitted changes" | Najpierw zapisz: `git add -A` i `git commit -m "..."`.                  |
| Asystent pyta o decyzję                         | Odpowiedz. To pytanie, którego nie powinien rozstrzygać sam.            |
| Masz aplikację mobilną z wcześniejszej wersji   | `react-dev sync --with-template`, potem `npm install` i `npm run port`. |

---

## Czego nie robić

- **Nie edytuj plików w folderze strony z poziomu aplikacji mobilnej.** Zmiany na
  stronie robisz na stronie, potem `npm run port`.
- **Nie edytuj `PORT.md`.** Tworzy się sam przy każdym `npm run port`.
- **Nie twórz aplikacji mobilnej w środku folderu strony.** Zawsze obok.
- **Nie instaluj bibliotek przez `npm install <nazwa>`.** Poproś asystenta — on
  sprawdza, czy działają w Expo Go.
