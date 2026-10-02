# Zacznij tutaj

**Dla osoby, która nigdy nie programowała.** Nie będziesz pisać kodu. Będziesz
wpisywać krótkie komendy i odpowiadać na pytania. Budowaniem zajmuje się
komputer.

English version: [START-HERE.md](START-HERE.md)

---

## Co to właściwie jest

Zbudujesz stronę internetową, **rozmawiając z asystentem**. Asystent potrafi
tworzyć pliki na Twoim komputerze. Ten projekt daje mu bardzo dokładne
instrukcje, więc za każdym razem buduje w ten sam, staranny sposób — i sam
sprawdza swoją pracę, zanim powie, że skończył.

Jest **jedenaście kroków**. Robisz je po kolei. Każdy krok to jedna krótka komenda.
Po każdej komendzie asystent sam mówi, co wpisać dalej, więc nie musisz niczego
pamiętać.

Kroki 3–11 powtarzasz **dla każdej strony albo funkcji**, którą chcesz dodać.
Pierwsze dwa kroki robisz tylko raz, na samym początku.

---

## Słowa, które zobaczysz

| Słowo              | Co znaczy                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| **Terminal**       | Okno, w którym pisze się komendy, zamiast klikać. W Windows wyszukaj „Terminal", na Macu też „Terminal". |
| **Komenda**        | Linijka tekstu, którą wpisujesz i zatwierdzasz Enterem.                                                  |
| **Folder**         | Dokładnie to, co myślisz. Twój projekt siedzi w jednym folderze.                                         |
| **Funkcja**        | Jedna rzecz, którą człowiek może zrobić na stronie: zarejestrować się, zobaczyć listę, zapłacić.         |
| **Bramka** (gate)  | Automatyczna kontrola. Jak przegląd samochodu: albo przechodzi, albo mówi, co jest zepsute.              |
| **Gałąź** (branch) | Bezpieczna kopia projektu do pracy, żeby pomyłka nie zepsuła tego, co już działa.                        |

Kiedy zobaczysz taką ramkę, wpisz to, co jest w środku, i wciśnij Enter:

```
npm run dev
```

---

## Część 0 — jednorazowe przygotowanie (około 20 minut)

To robisz tylko raz na danym komputerze. Są cztery rzeczy i instalujesz je w tej
kolejności.

**1. Zainstaluj Node.js.** Wejdź na <https://nodejs.org> i pobierz plik z dużego
zielonego przycisku. Zainstaluj jak każdy normalny program. Potrzebujesz wersji
20 lub nowszej — strona i tak daje nowszą.

**2. Zainstaluj pomocnika o nazwie `uv`.** To on instaluje narzędzie projektu.
Otwórz Terminal i wklej **jedną** linijkę, zależnie od komputera.

Na Macu albo Linuksie:

```
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Na Windowsie:

```
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**Potem zamknij Terminal całkowicie i otwórz go ponownie.** To jest ważne — nowa
komenda istnieje tylko w świeżo otwartym oknie.

**3. Zainstaluj narzędzie projektu:**

```
uv tool install react-developer --from https://github.com/Mil000D/react-developer.git
```

**4. Zainstaluj asystenta:**

```
npm install -g @anthropic-ai/claude-code
```

**5. Sprawdź, czy wszystko się udało.** Wpisz każdą z tych trzech linijek:

```
node --version
react-dev version
claude --version
```

Każda powinna odpowiedzieć numerem wersji, na przykład `v22.22.0`. Jeśli
któraś mówi **„command not found"**, to ta jedna rzecz się nie zainstalowała:

- `node` → powtórz punkt 1
- `react-dev` → powtórz punkty 2 i 3 i upewnij się, że zamknąłeś i otworzyłeś Terminal
- `claude` → powtórz punkt 4

---

## Część 1 — stwórz projekt

**1. Utwórz projekt.** W Terminalu wpisz to (zamiast `mojastrona` możesz wpisać
dowolną nazwę, ale bez spacji i bez polskich znaków):

```
react-dev init mojastrona
```

**2. Wejdź do niego:**

```
cd mojastrona
```

`cd` znaczy „wejdź do tego folderu". Będziesz tego używać często.

**3. Pobierz potrzebne części.** To zajmuje kilka minut i wypisuje dużo tekstu.
Tak ma być.

```
npm install
```

**4. Sprawdź, czy nic nie jest zepsute:**

```
npm run verify
```

To uruchamia wszystkie automatyczne kontrole. Jeśli ostatnia linijka nie jest
błędem, wszystko jest zdrowe. **Jeśli tutaj coś nie przechodzi — jeszcze przed
jakąkolwiek Twoją zmianą — to znaczy, że pobieranie się nie udało.** Powiedz o tym
i poproś o pomoc, zamiast iść dalej.

---

## Część 2 — zobacz swoją stronę

To jest ta część, o którą wszyscy pytają najpierw.

**1. Uruchom ją:**

```
npm run dev
```

**2. Spójrz, co wypisało.** Wśród tekstu jest linijka taka jak ta:

```
  ➜  Local:   http://localhost:5173/
```

**Otwórz w przeglądarce dokładnie ten adres.** Zwykle jest to `5173`, ale jeśli
ten numer był już zajęty, program po cichu bierze `5174` albo `5175` — więc
przeczytaj tę linijkę, nie zakładaj z góry. W wielu Terminalach wystarczy
kliknąć ją z Ctrl.

Twoja strona jest na ekranie. **Nie zamykaj tego okna Terminala** — zamknięcie go
albo wciśnięcie Ctrl+C wyłącza stronę. Strona odświeża się sama w momencie, gdy
asystent cokolwiek zmieni, więc zostaw tę kartę przeglądarki otwartą podczas
pracy.

Żeby wyłączyć później: kliknij to okno Terminala i wciśnij **Ctrl+C**.

> `localhost` znaczy „ten komputer". Nikt inny nie widzi tego adresu. Twoja strona
> nie jest jeszcze w internecie i nic, co tu robisz, nie jest publiczne.

---

## Część 3 — uruchom asystenta

Otwórz **drugie** okno Terminala, żeby pierwsze mogło dalej trzymać włączoną
stronę.

Wejdź do folderu projektu i uruchom asystenta:

```
cd mojastrona
claude --dangerously-skip-permissions
```

Od teraz z nim rozmawiasz. Pisz normalnymi zdaniami, po polsku — rozumie. Komendy
specjalne zaczynają się od ukośnika, na przykład `/react-spec`, i te wpisujesz
dokładnie tak, jak są napisane.

---

## Część 4 — jedenaście kroków

Rób je po kolei. **Nie musisz ich pamiętać.** Każdy kończy się informacją, co
wpisać dalej. Czytaj ostatnie trzy linijki odpowiedzi asystenta, a całą resztę
spokojnie pomiń:

```
> Stage 4 of 11 complete. spec.md written — 7 open questions.
> Do next: /react-clarify — it asks them one at a time.
> Zero questions? /react-implement directly.
```

W tym cała sztuczka. **Ostatni blok, jedna komenda, wpisujesz ją.**

### Raz na projekt

**Krok 1 — ustalcie zasady.**

```
/react-constitution
```

Zada kilka pytań o Twój projekt i zapisze zasady. Wszystko późniejsze ich
słucha. Zajmuje parę minut.

**Krok 2 — zaplanuj całą stronę.**

```
/react-roadmap
```

Opisz własnymi słowami, czego chcesz — możesz pisać długo. „Strona, na której
właściciele psów trzymają książeczki szczepień i poznają innych właścicieli w
okolicy." Zamieni to w ponumerowaną listę funkcji w sensownej kolejności i
zapisze wszystkie pytania, na które nie umiał sam odpowiedzieć.

Jeśli najpierw zaprojektowałeś strony w **Google Stitch**, powiedz mu o tym —
użyje tych projektów.

### Potem raz na każdą funkcję, w kółko

**Krok 3 — odpowiedz na ważne pytania.**

```
/react-clarify
```

Zadaje **jedno pytanie na raz**, z kilkoma opcjami do wyboru i z rekomendacją.
Wybierasz numer. To najbardziej opłacalne dziesięć minut w całym procesie: błędne
założenie wyłapane tutaj nie kosztuje nic, a wyłapane później kosztuje dni pracy.

Jeśli naprawdę nie wiesz, napisz „zdecyduj sam" — wybierze, zapisze, co założył,
i oznaczy to.

**Krok 4 — zacznij jedną funkcję.**

```
/react-feature 1
```

`1` to numer funkcji z planu. Przygotuje bezpieczną kopię do pracy i utworzy
pliki.

**Krok 5 — zapisz dokładnie, co zostanie zbudowane.**

```
/react-spec
```

Opisze funkcję i **zaznaczy wszystko, czego nie jest pewien**. Te zaznaczenia to
dobra wiadomość. Plan z siedmioma szczerymi pytaniami jest lepszy niż pewny
siebie plan, który wymyślił sobie siedem odpowiedzi.

**Krok 6 — odpowiedz na te pytania.**

```
/react-clarify
```

Tak samo jak w kroku 3, tylko teraz o tej jednej funkcji.

**Krok 7 — zbuduj to.**

```
/react-implement
```

To ten długi krok. Tu powstaje prawdziwy kod. Jak skończy, zajrzyj do karty
przeglądarki — strona się zmieniła.

**Krok 8 — sprawdź, czy działa.**

```
/react-verify
```

Uruchamia wszystkie automatyczne kontrole, otwiera w tle prawdziwą przeglądarkę,
przeklikuje Twoją stronę i robi zdjęcia, żeby porównać je z poprzednimi. Raportuje
to, co faktycznie się stało — nie to, na co liczy.

**Jeśli coś jest na czerwono, nie idź dalej.** Asystent powie, co się zepsuło i co
wpisać. Czerwony kolor tutaj to znak, że system działa poprawnie.

**Krok 9 — ostatnie czytanie.**

```
/react-analyze
```

Porównuje to, co zbudowano, z tym, co ustaliliście w kroku 5. Znajduje rzeczy,
które po cichu się rozjechały. Tylko raportuje — niczego nie zmienia.

**Krok 10 — porządny przegląd kodu.**

```
/react-review
```

Krok 8 sprawdził, czy maszyna jest zadowolona. Ten krok szuka błędów, których
maszyna nie potrafi zauważyć — na przykład listy, która przestawia wiersze przy
filtrowaniu, albo kółka ładowania, które nigdy się nie zatrzymuje, gdy dwie
rzeczy wczytują się równocześnie.

Zapisuje to, co znalazł, do pliku, z etykietą przy każdej rzeczy. Cokolwiek z
etykietą `blocker` **zablokuje** następny krok, dopóki tego nie naprawisz. Jeśli
tak się stanie: `/react-implement` żeby naprawić, potem `/react-verify`, potem
ten krok jeszcze raz.

**Krok 11 — zakończ i odłóż.**

```
/react-ship
```

Porządnie pakuje pracę, razem z przeglądem. **Odmówi**, jeśli kontrole nie
przechodzą albo coś jest niedokończone — i o to właśnie chodzi.

Potem:

```
/react-merge
```

To wkleja gotową funkcję do Twojej głównej strony i odhacza ją na planie. Na
końcu powie, którą funkcję można teraz zrobić dalej.

**Teraz wróć do kroku 4 z następnym numerem.** To cała pętla.

---

## Jeśli się pogubisz

Wpisz to w tym Terminalu, w którym **nie** działa strona:

```
react-dev status
```

Wypisze wszystkie funkcje, jak daleko jest każda z nich, i jedną komendę do
wpisania. Wylicza to z Twoich prawdziwych plików, więc ma rację nawet wtedy, gdy
coś zrobiłeś ręcznie albo wróciłeś po tygodniu przerwy.

```
   #  Feature        Pipeline    Stage      Next
●  1  landing        ━━━━━━━━    merged
◐  2  dog-profile    ━━━━┄┄┄┄    clarified  /react-implement
○  3  weight         ━┄┄┄┄┄┄┄    planned    /react-feature 3
```

Pełne kółko = gotowe. Pół kółka = w trakcie. Puste kółko = nierozpoczęte.

---

## Gdy coś na stronie wygląda źle

Nie musisz tłumaczyć, gdzie to jest. **Po prostu wskaż palcem.**

Kiedy Twoja strona działa w przeglądarce, w narożniku jest mały przycisk
**Feedback**.

1. Kliknij **Feedback**. Zmieni się na „Click an element…".
2. Kliknij na stronie to, co wygląda źle.
3. Pokaże się „Sent ✓".

To zapisuje dokładnie, który plik i która linijka narysowały ten element. Przy
następnej wiadomości do asystenta on już wie, co wskazałeś — możesz po prostu
napisać „odstępy są złe", bez tłumaczenia gdzie.

---

## Kiedy coś pójdzie nie tak

| Co widzisz                                        | Co zrobić                                                                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `command not found: react-dev`                    | Nie jesteś w dobrym miejscu albo Część 0 się nie dokończyła. Spróbuj najpierw `cd mojastrona`.                                                   |
| `command not found: npm`                          | Node.js nie jest zainstalowany. Wróć do Części 0, punkt 1.                                                                                       |
| Przeglądarka pisze „nie można połączyć"           | Albo strona nie działa — idź do pierwszego Terminala i wpisz `npm run dev` — albo otworzyłeś zły numer. Przeczytaj jeszcze raz linijkę `Local:`. |
| Strona się wczytuje, ale to czyjś inny projekt    | Otworzyłeś `5173`, a Twoja strona jest na `5174`. Przeczytaj linijkę `Local:` ponownie.                                                          |
| Strona jest pusta i biała                         | Spójrz na Terminal, w którym działa strona. Błąd jest tam — skopiuj czerwony tekst i wklej asystentowi.                                          |
| Kontrola świeci na czerwono i nic nie rozumiesz   | Wklej całość asystentowi i napisz „wytłumacz mi to prostymi słowami". To zupełnie normalna prośba.                                               |
| Asystent się zatrzymał i nie powiedział, co dalej | Wpisz `react-dev status`.                                                                                                                        |
| Masz poczucie, że wszystko zepsułeś               | Prawie na pewno nie: gotowa praca leży w osobnej, bezpiecznej kopii. Wpisz `react-dev status` i powiedz, co robiłeś.                             |

---

## Czterech rzeczy nie rób

1. **Nie pomijaj kroków 8 i 10.** Niesprawdzona praca się kumuluje, a właśnie ta kupka
   staje się potem nie do naprawienia.
2. **Nie twórz plików samodzielnie** w folderze projektu. Poproś asystenta. On
   trzyma wszystko w formie, którą narzędzia rozumieją.
3. **Nie odpowiadaj „rób jak chcesz" na wszystko** w krokach 3 i 6. Dwie–trzy
   prawdziwe decyzje tam oszczędzają całe dni.
4. **Nie rób dwóch funkcji równocześnie.** Dokończ jedną do kroku 11, potem
   zacznij następną. Cały system jest zbudowany pod jedną na raz.

---

## Jedna rzecz do zapamiętania

**Czytaj ostatni blok każdej odpowiedzi. Wpisuj komendę, którą podaje.**

Cała reszta tego pliku to szczegóły, które możesz sprawdzić, kiedy będą potrzebne.
