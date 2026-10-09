# Zacznij tutaj

**Dla osoby, która nigdy nie programowała.** Nie będziesz pisać kodu. Będziesz
wpisywać krótkie komendy i odpowiadać na pytania. Budowaniem zajmuje się
komputer.

English version: [INSTRUCTION.md](INSTRUCTION.md)

Aplikacja na telefon ze strony: [INSTRUKCJA-MOBILE.md](INSTRUKCJA-MOBILE.md)

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
uv tool install react-developer --from https://github.com/octopussinus/react-developer.git
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
użyje tych projektów, dodaj MCP Serwer wg. instrukcji Google Stitch po przyciśnieciu eksportuj wyswietli sie taka opcja.

**Masz własne projekty ekranów?** (Opcjonalnie.) Wrzuć je do folderu
**`designs/`** w projekcie przed tym krokiem — obrazki PNG albo JPG każdego ekranu
(zrzuty ekranu, eksport z Figmy, nawet zdjęcie szkicu) albo prototypy w HTML.
Jeden plik na ekran, nazwany jak podstrona: `designs/home.png`,
`designs/orders-list.png`. Wersje na telefon możesz dać do `designs/mobile/`.
Asystent je obejrzy, zaplanuje według nich, zbuduje każdą stronę tak, żeby
wyglądała jak projekt, i na końcu porówna z nimi swoje zrzuty ekranu. Plik
`designs/README.md` w projekcie opisuje nazewnictwo.

**Krok 2b — dokończ warunki wstępne.**

Plan zaczyna się od krótkiej listy **warunków wstępnych** (prerequisites) —
rzeczy, od których zależy każda strona, a które same nie są stronami: skąd dane
przychodzą z serwera, logowanie, Twoje kolory, języki, menu wokół każdej strony.
Są oznaczone `P1`, `P2`… a `react-dev status` pokazuje, które są gotowe.

```
/react-prerequisites
```

Przechodzi przez nie po kolei. Gdy któryś wymaga Twojej decyzji, pyta — jedno
pytanie na raz, z rekomendacją — potem go buduje, sprawdza i oznacza jako gotowy.
Uruchamiaj go, aż `react-dev status` pokaże wszystkie jako gotowe. **Nie zaczynaj
pierwszej strony wcześniej**: strona zbudowana na niedokończonym warunku jest
zbudowana na zgadywaniu, i `/react-feature` Ci to powie.

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

**Kilka funkcji naraz zamiast jednej?** Gdy plan i warunki wstępne są gotowe, a
pytania odpowiedziane, możesz budować kilka funkcji równolegle — każdą przez
osobnego asystenta, w osobnej kopii projektu:

```
/react-parallel
```

Pokaże, które funkcje można bezpiecznie budować razem, zapyta ile, i je
uruchomi. Szybciej, ale nie widzisz każdej z nich w trakcie pracy — przy
pierwszych kilku funkcjach zostań przy `/react-implement`. Szczegóły:
[Budowanie kilku funkcji naraz](#budowanie-kilku-funkcji-naraz).

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

**Krok 11 — zakończ.**

```
/react-ship
```

**Odmówi**, jeśli kontrole nie
przechodzą albo coś jest niedokończone — i o to właśnie chodzi.

Potem:

```
/react-merge
```

To wkleja gotową funkcję do Twojej głównej strony i odhacza ją na planie. Na
końcu powie, którą funkcję można teraz zrobić dalej.

**Teraz wróć do kroku 4 z następnym numerem.** To cała pętla.

---

## Czyszczenie pamięci asystenta

Asystent pamięta wszystko, co padło w sesji. To przydatne, dopóki budujesz jedną
rzecz, i staje się obciążeniem, gdy przechodzisz do następnej: stara rozmowa
wypiera nową i odpowiedzi robią się gorsze.

Czyścisz to wpisując:

```
/clear
```

**Tylko w trzech miejscach**, a asystent sam powie, kiedy do nich dojdziesz:

| Po                                  | Dlaczego                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------ |
| **Kroku 1** (`/react-constitution`) | Zasady są zapisane w pliku, który asystent i tak zawsze czyta            |
| **Kroku 2** (`/react-roadmap`)      | Plan jest zapisany, a planowanie całego produktu to bardzo długa rozmowa |
| **Kroku 11** (`/react-merge`)       | Funkcja jest skończona i wszystko o niej jest zapisane                   |

**Nigdy w środku pracy nad funkcją.** Kroki 3–10 to jedna całość: decyzje z kroku
5 są tym, na czym buduje krok 7. Wyczyszczenie tam je wyrzuca, a asystent zgaduje
od nowa — gorzej.

Prosty sprawdzian: _czy musiałbyś wytłumaczyć poprzednie zadanie nowej osobie,
zanim poprośisz ją o to kolejne?_ Jeśli nie — czyść. Jeśli tak — nie czyść.

Jeśli jedna funkcja ciągnie się bardzo długo i asystent zaczyna zwalniać, jest
łagodniejsza opcja, która streszcza zamiast zapominać:

```
/compact
```

Tej używaj **w trakcie** pracy nad czymś; `/clear` **między** rzeczami.

### Żeby działo się samo

Możesz w ogóle o tym nie pamiętać:

```
react-dev next
```

Komenda sprawdza, gdzie jest Twój projekt, i otwiera **zupełnie nową sesję
asystenta**, od razu nakierowaną na następny krok — tego asystenta, którego masz
zainstalowanego, i w składni, której on oczekuje. Nowa sesja z definicji nie
pamięta poprzedniej, więc czysta karta dzieje się sama, a nie wtedy, gdy sobie o
niej przypomnisz.

Jedno uczciwe ograniczenie, o którym komenda sama mówi: przenosi się tylko to, co
**zapisane w plikach**. Na granicy funkcji to jest wszystko. W środku pracy nad
funkcją — jeśli przed chwilą coś ustaliłeś na czacie i nikt tego nie zapisał,
powtórz to albo zapisz najpierw.

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
2. Kliknij na stronie to, o czym chcesz porozmawiać.
3. Otworzy się mały panel. Możesz dopisać notatkę, a potem wybierz, czego chcesz:

| Przycisk                       | Co robi                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| **Something is wrong with it** | Zgłasza to jako błąd do naprawy                                                     |
| **I want this elsewhere too**  | Prosi, żeby dało się tego użyć także na innych stronach                             |
| **Change how it looks**        | Traktowane jako zmiana kolorów/odstępów w całej stronie, nie łatka w jednym miejscu |
| **Fix the wording**            | Trafia do plików z tłumaczeniami, żeby oba języki się zgadzały                      |
| **Explain what this is**       | Tylko wyjaśnia, nic nie zmienia                                                     |

Przy każdym przycisku jest **(i)**. Kliknij go, a dostaniesz jedno zdanie o tym,
co wybór tej opcji faktycznie każe zrobić asystentowi — warto przeczytać raz.

To zapisuje dokładnie, który plik i która linijka narysowały ten element. Przy
następnej wiadomości do asystenta on już wie, co wskazałeś i o co poprosiłeś —
więc nigdy nie musisz tłumaczyć, gdzie coś jest.

### Nic, co wyślesz, nie znika

Przycisk **List**, obok Feedback, pokazuje wszystko, co wysłałeś, i na jakim jest
etapie. Otwiera się **obok** tego, co już jest otwarte, a nie na wierzchu — więc
możesz czytać listę, kiedy panel feedbacku wciąż jest na ekranie. Tak samo
zachowują się wszystkie pozostałe panele w tym rogu:

| Etykieta        | Co znaczy                                                |
| --------------- | -------------------------------------------------------- |
| **waiting**     | Wysłane. Nikt jeszcze nie zaczął                         |
| **in progress** | Asystent się tym zajmuje albo skończył i czeka na Ciebie |
| **done**        | Potwierdziłeś, że naprawdę jest naprawione               |

Kiedy asystent coś skończy, dopisuje krótką notatkę — co zmienił i na co spojrzeć
— a pod spodem pojawiają się przyciski **Yes, done** i **Not fixed**. **Tylko Ty
możesz je wcisnąć.** Asystent nie może sam oznaczyć swojej pracy jako zrobionej i
to jest celowe: jedynym prawdziwym sprawdzianem „czy naprawione" jest Twoje
spojrzenie na ekran.

**Not fixed** odsyła zgłoszenie na początek listy i kasuje notatkę asystenta, żeby
kolejne podejście zaczynało się od czysta. To, co potwierdzisz jako zrobione, nie
trafia już nigdy do asystenta.

Każde zgłoszenie, na dowolnym etapie, ma też dwa własne przyciski:

- **Edit** — przeredaguj je. Przydaje się, gdy po czasie widzisz, że napisałeś to
  mniej precyzyjnie, niż chciałeś. Zgłoszenie zostaje dokładnie tam, gdzie było:
  przeredagowanie opisu nie zmienia tego, czy jest zrobione.
- **Delete** — usuń je na dobre. Najpierw pyta o potwierdzenie i jest jedyną
  rzeczą w całym systemie, która cokolwiek kasuje. Asystent nigdy tego nie zrobi
  — jeśli uważa, że skończył, może tylko to napisać i czekać na Ciebie.

## Podgląd: co zostało użyte ponownie, a co jest nowe

Obok **Feedback** jest przycisk **Dev**. Kliknij go, a każdy element strony
dostanie kolorową ramkę:

| Kolor              | Co znaczy                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **Zielony**        | Użyte ponownie — to już istniało, asystent nie budował tego od nowa                       |
| **Fioletowy**      | Nowe, ale wrzucone do wspólnej puli — słuszne tylko wtedy, gdy użyje tego też inna strona |
| **Niebieski**      | Napisane specjalnie dla funkcji, nad którą pracujesz                                      |
| **Jasnoniebieski** | Kod funkcji starszy niż to, nad czym teraz pracujesz                                      |
| **Szary**          | Rama wokół strony: menu, układ                                                            |

To najszybszy sposób, żeby odpowiedzieć na pytanie „czy asystent użył moich
rzeczy, czy po cichu zbudował drugą wersję tego samego?”. Dużo niebieskiego tam,
gdzie spodziewałeś się zielonego, zwykle znaczy, że coś zostało zbudowane od
nowa, choć już istniało.

Panel w rogu wygląda i działa jak panel feedbacku: liczy każdą grupę, a każdy
wiersz ma **(i)**, które wyjaśnia, co ten kolor znaczy i co z tym zrobić — więc
nie musisz się domyślać, o czym mówi „New, placed as shared". Kliknij wiersz, żeby
ukryć grupę. Wciśnij **Esc** albo kliknij **Dev** ponownie, żeby wyłączyć.

**O przycisku „I want this elsewhere too":** asystent dopyta, _która jeszcze
strona_ tego potrzebuje. I to celowo. Uwspólnianie czegoś, zanim dwie strony
naprawdę tego używają, zwykle tworzy komponent, który nie pasuje do żadnej z nich
— więc „na zapas" to za słaby powód i asystent to powie.

---

## Mapa całej strony

Przycisk **Map**, obok Feedback, rysuje wszystkie strony Twojej witryny i
wszystkie przyciski oraz odnośniki, które między nimi przenoszą.

Otwiera się na **połowie ekranu, obok Twojej strony**, a nie na niej — strona dalej
tam jest i dalej działa, tylko jest węższa. **Przeciągnij lewą krawędź mapy**, żeby
dać więcej miejsca jednej albo drugiej stronie; szerokość zostaje zapamiętana.

Nie wysypuje tego wszystkiego naraz. Zaczyna od strony głównej, a każda strona,
która gdzieś prowadzi, ma małe `▸` i liczbę — `▸ +6` znaczy sześć wyjść.
**Kliknij stronę, a ona się rozwinie** i pokaże dokładnie, do których stron
potrafi przenieść. Kliknij ponownie, żeby ją zwinąć. `Expand all` i `Collapse`
są w lewym górnym rogu.

- podpis na strzałce to **nazwa komponentu odpowiedzialnego za to przejście** —
  czyli plik, który otwierasz, jeśli chcesz zmienić, dokąd prowadzi
- **niebieska linia** to zwykły odnośnik
- **fioletowa linia** to automatyczne przekierowanie — nikt go nie klika, dzieje
  się samo
- **bursztynowa strona** to taka, do której nic nie prowadzi — zwykle warto
  sprawdzić, czy to nie pomyłka
- **kłódka** oznacza stronę wymagającą uprawnień

**Kliknij dowolną strzałkę**, a panel pokaże resztę: tekst, który klikasz (albo,
przy automatycznym przekierowaniu, warunek który je uruchamia, np.
`if status === 'unauthenticated'`), czy to odnośnik czy przycisk, w którym
komponencie się znajduje oraz **plik i numer linii** — z przyciskiem do
skopiowania. Mapa nie mówi więc tylko „te dwie strony są połączone", ale też gdzie
pójść i to zmienić.

### Pokaż mi to na stronie

Każde pudełko ma małe **↗**. Naciśnij je i dzieją się dwie rzeczy naraz: Twoja
strona przechodzi na tę podstronę w drugiej połowie ekranu, a **każde wyjście z
tej podstrony dostaje kolorową obwódkę na samej stronie**, z podpisem, gdzie
prowadzi.

Odnośniki do tego samego miejsca mają ten sam kolor, a strzałka na mapie jest
narysowana tym samym kolorem — więc „te różowe prowadzą do profilu psa" widzisz
w obu połowach jednocześnie. Jeśli pierwszy obwiedziony odnośnik jest poniżej
ekranu, strona sama do niego przewinie.

Pod mapą jest licznik: **„4 of 6 on screen"**. Pozostałe dwa są wyszarzone i to
jest ta użyteczna część — odnośnik może istnieć w kodzie i nie być teraz
narysowany, bo siedzi w zamkniętym menu, w stanie pustym albo w gałęzi, do której
te dane nie dochodzą. Cztery obwódki bez licznika czytałoby się po prostu jako
„są cztery".

Podstrony z `:` w nazwie (`/dogs/:dogId`) nie da się odwiedzić dosłownie, więc
otwierają się z `1` w miejscu parametru (`/dogs/1`) — i jest to napisane.

Część przycisków decyduje, dokąd przejść, dopiero w trakcie działania aplikacji —
i żadne czytanie kodu tego z góry nie powie. Takie przypadki są rysowane jako
przerywana strzałka do pudełka **„? decided at runtime"**, a nie ukrywane — po
kliknięciu dalej zobaczysz komponent i linię, więc możesz pójść i przeczytać, co
tam się dzieje.

Warto zajrzeć po zbudowaniu kilku stron: to najszybszy sposób, żeby wyłapać
stronę, którą zrobiłeś, ale zapomniałeś skądkolwiek do niej podlinkować.

---

## Podgląd klocków, z których to jest zbudowane

Przycisk **Storybook**, obok Map, otwiera bibliotekę komponentów Twojego
projektu — każdy przycisk, znacznik, kartę i pole formularza osobno, poza
jakąkolwiek stroną, razem z pokrętłami do przełączania wariantów.

To miejsce, w którym odpowiadasz sobie na pytanie „co ja już mam?", zanim
poprosisz o coś nowego, i w którym widzisz komponent we wszystkich stanach naraz:
znacznik w czterech odmianach, przycisk wyłączony, pole z błędem.

Potrzebuje jednej rzeczy uruchomionej. W drugim terminalu, w swoim projekcie:

```
npm run storybook
```

Jeśli nie jest uruchomiony, przycisk to napisze i pokaże dokładnie tę komendę.
Adres jest **własny dla tego projektu** — dwa projekty otwarte w tym samym czasie
nie mogą pokazać Ci komponentów tego drugiego, a to pomyłka, której byś nie
zauważył.

## Użycie tego samego komponentu w innym projekcie

Trzy poziomy — dwa pierwsze asystent ogarnia sam:

| Poziom                        | Kiedy                           | Co się dzieje                                                          |
| ----------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| Wewnątrz jednej funkcji       | zawsze                          | Komponent powstaje w folderze tej funkcji                              |
| Wspólny w tym projekcie       | potrzebuje go druga strona      | `promote` przenosi go do wspólnego folderu i poprawia wszystkie użycia |
| **Wspólny między projektami** | potrzebuje go **drugi projekt** | Publikujesz go do rejestru — patrz niżej                               |

Trzeci poziom **celowo nie jest automatyczny**. Po opublikowaniu komponentu inne
projekty go instalują i nie da się tego cofnąć — więc to decyzja, którą
podejmujesz świadomie, a nie coś, co dzieje się po cichu w tle.

Żeby opublikować, poproś o to:

```
> /react-publish
```

Asystent nie zrobi tego od razu. Najpierw sprawdza cztery rzeczy i zatrzymuje
się, jeśli któraś nie przejdzie:

1. **Czy drugi projekt naprawdę tego potrzebuje** — zapyta, który, z nazwy.
   „Wygląda ogólnie" to za słaby powód; tak właśnie wspólna biblioteka zapycha
   się rzeczami, których nikt nie używa.
2. **Czy nie wie nic o Twoim biznesie.** Komponent, w którym występuje `Order`
   albo `Dog`, jest bezużyteczny w projekcie, który nie ma ani jednego, ani
   drugiego.
3. **Czy używa nazw kolorów z Twojego motywu, a nie sztywnych kolorów.** Inaczej
   przeniesie Twoją kolorystykę do cudzej aplikacji.
4. **Czy jest na właściwym poziomie folderów** — to jest zapisane w komponencie
   na stałe i każdy projekt dostanie go w tym samym miejscu.

Jeśli przejdzie, asystent dodaje go do rejestru, sprawdza, czy instaluje się
czysto w świeżym projekcie, i mówi Ci, żeby wypchnąć zmiany.

### Jak pobrać go w innym projekcie

W folderze tego drugiego projektu:

```
npx shadcn@latest add @react-dev/NAZWA
```

Zamiast `NAZWA` wpisz nazwę komponentu małymi literami z myślnikami — na
przykład `npx shadcn@latest add @react-dev/data-table`. Komenda wrzuca komponent,
jego stronę przykładową i test do właściwego folderu oraz instaluje wszystko, czego
on potrzebuje. Potem uruchom `npm run verify`.

**Ta krótka forma działa dopiero wtedy, gdy rejestr jest opublikowany.** Dopóki
nie jest — a w tej chwili nie jest — użyj pełnej ścieżki do pliku:

```
npx shadcn@latest add /ścieżka/do/react-developer/registry/public/r/NAZWA.json
```

Robi dokładnie to samo i działa od razu na Twoim komputerze. Jeśli chcesz krótką
formę, poproś asystenta o opublikowanie rejestru — wymaga to jednorazowego
włączenia hostingu dla repozytorium.

## Przełączanie motywu i języka w trakcie pracy

Na lewo od **Feedback** są dwa kolejne przyciski:

**Przycisk motywu** pokazuje, co jest aktywne, np. `Default · system`. Kliknięcie
otwiera menu z **trzema motywami** oraz jasny/ciemny/systemowy. Motywy to nie
tylko inne kolory — przyciski i pola naprawdę zmieniają kształt: zaokrąglenia,
grubość obramowania, wagę czcionki, cień. Przeskakiwanie między nimi to
najszybszy sposób, żeby wyłapać cokolwiek, co ma kolor albo zaokrąglenie wpisane
na sztywno zamiast pobrane z tokenów.

**Przycisk języka** pokazuje `EN` albo `PL` i przełącza między nimi. Twój projekt
zawsze ma oba, nawet jeśli projekt graficzny pokazuje jeden — bo układ, który
przetrwał tylko po angielsku, to układ, którego nikt nie przetestował. Polskie i
niemieckie słowa są dłuższe i potrafią rozwalić layout.

Oba to narzędzia dla programisty, nie część Twojej strony. Jeśli projekt
przewiduje prawdziwy przełącznik motywu albo języka dla użytkowników, poproś o
niego — te dwa działają niezależnie.

Każdy projekt startuje z trzema motywami i dwoma językami, niezależnie od tego,
czy design o nich wspomina. Jeśli masz projekt graficzny, poproś asystenta, żeby
przerobił te trzy pod niego — **a nie zszedł do jednego**. Zapasowe motywy nic nie
kosztują, a to one wyłapują wcześnie kolor wpisany na sztywno.

## Trzy dodatkowe rzeczy, które warto znać

### Storybook — podgląd każdego stanu komponentu

Twoja strona pokazuje kółko ładowania przez pół sekundy, a ekran błędu tylko
wtedy, gdy coś naprawdę się zepsuje. Storybook pokazuje wszystkie te stany na
żądanie, każdy komponent na osobnej stronie:

```
npm run storybook
```

Potem otwórz adres, który wypisze — zwykle **http://localhost:6006**, ale jeśli ten
numer jest zajęty, po cichu weźmie inny, więc przeczytaj tę linijkę, nie zakładaj z
góry. Zostaw to włączone w osobnym Terminalu, tak samo jak samą stronę.

Każdy komponent, który zbuduje asystent, dostaje tu swoją stronę — to akurat
dzieje się automatycznie i wymagają tego zasady projektu. Dodatkowe stany
(ładowanie, pusto, błąd, bardzo długi tekst) asystent dopisuje przy implementacji
komponentu, więc jeśli któregoś brakuje, możesz spokojnie o niego poprosić.
Przełącznik na górnym pasku zmienia całość między trybem jasnym a ciemnym.

Na dole każdej strony jest **szary pasek ze ścieżką do pliku** komponentu, który
oglądasz — `src/components/atoms/badge.tsx` — oraz przycisk **Copy path**, który
kopiuje pełną ścieżkę z Twojego dysku. To najszybsza odpowiedź na pytanie „gdzie
to właściwie leży?".

Osobna sprawa: `npm run visual` robi zdjęcia **prawdziwym stronom** Twojej
aplikacji w obu trybach i mówi, czy coś się przesunęło od poprzedniego razu. Inne
narzędzie, ta sama myśl.

Pomyśl o tym jak o warsztacie. Strona to gotowy pokój.

### `/react-i18n` — języki

Projekt startuje z **angielskim i polskim**. Żaden widoczny tekst nie jest wpisany
bezpośrednio w kod — wszystko siedzi w plikach z tłumaczeniami, więc dodanie
języka nigdy nie oznacza przeszukiwania komponentów.

```
> /react-i18n
```

Użyj tego, żeby dodać język albo gdy brakuje tłumaczenia. Automatyczna kontrola
(`npm run i18n:check`) porównuje języki i **nie przechodzi, jeśli w którymś
brakuje linijki** — dzięki temu półprzetłumaczony ekran nie wejdzie po cichu z
angielskim w środku polskiego.

### `/react-feedback` — żeby przestał powtarzać ten sam błąd

Jeśli poprawiasz tę samą rzecz trzeci raz, to nie jest już poprawka — to brakująca
zasada.

```
> /react-feedback
```

Czyta wszystko, co wysłałeś przyciskiem **Feedback**, plus Twoje uwagi z czatu,
grupuje to, a kiedy coś pojawiło się **trzy razy lub więcej**, zamienia to w stałą
zasadę: albo linijkę w `AGENTS.md`, którą asystent czyta za każdym razem, albo —
jeśli zasadę da się sprawdzić maszynowo — automatyczną kontrolę, która wywala
build.

Warto uruchamiać mniej więcej raz w tygodniu i po każdym przeglądzie. To jedyna
część systemu, dzięki której asystent robi się lepszy **w Twoim** projekcie,
zamiast stać w miejscu.

## Budowanie kilku funkcji naraz

Normalna pętla to jedna funkcja na raz i przy pierwszych kilku to jest właściwa
droga. Kiedy plan jest już ustalony, asystent potrafi też zbudować kilka naraz —
każdą w **osobnej kopii Twojego projektu**, przez osobnego asystenta, w tym samym
czasie.

Co wpisujesz:

```
react-dev parallel
```

To wypisze, które funkcje można bezpiecznie budować razem **i dlaczego pozostałe
nie**. Dwie funkcje dotykające tej samej części aplikacji nigdy nie trafią do
jednej paczki: obie kopie edytowałyby ten sam plik, a obie zmiany zostałyby
połączone w coś, co nie działa.

Następnie:

```
react-dev dispatch
```

Każda dostaje własnego asystenta, który pracuje sam, bez okna, w które mógłbyś
patrzeć. Zamiast tego widzisz tabelę na żywo:

```
  #    Feature        Status     Time   Doing
  011  medications    ok          14m   ok
  017  matches        blocked      3m   stopped on a [NEEDS CLARIFICATION]
  024  product        running     11m   Bash npm run verify
```

- **ok** — skończone, wszystkie sprawdzenia na zielono
- **blocked** — trafił na pytanie, na które nie wolno mu odpowiedzieć samemu, i
  się zatrzymał. To jest poprawne zachowanie, nie błąd
- **failed** — coś się wywaliło; powód jest wypisany

**Nic nie ginie.** Każdy z tych asystentów zapisuje całą swoją sesję do
`.ai/runs/` i możesz ją potem przeczytać: każde polecenie, które wykonał, każdy
plik, którego dotknął, co powiedział na koniec i ile to trwało. Otwórz
`transcript.md` w folderze, który wskaże. `react-dev runs` pokazuje listę
wszystkich dotychczasowych paczek, a `react-dev runs --id <nazwa>` otwiera
jedną z nich.

Działa tak samo z Claude Code, Codex i Gemini CLI — `--agent codex` oraz
`--agent gemini` wybierają konkretnego. Proces się nie zmienia; zmienia się
tylko to, kto go wykonuje.

**Nic nie publikują.** Każdy kończy na „zrobione i sprawdzone". Scalasz je potem
pojedynczo, a asystent Cię przez to przeprowadzi — bo dwie skończone funkcje to
nie to samo co dwie funkcje, które działają razem, a jedyny sposób, żeby się
przekonać, to sprawdzić je połączone.

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
4. **Nie rób dwóch funkcji równocześnie ręcznie.** Dokończ jedną do kroku 11,
   potem zacznij następną. Jeśli naprawdę chcesz kilka naraz, użyj `react-dev
dispatch` — on rozdziela je jak należy.

---

## Jedna rzecz do zapamiętania

**Czytaj ostatni blok każdej odpowiedzi. Wpisuj komendę, którą podaje.**

Cała reszta tego pliku to szczegóły, które możesz sprawdzić, kiedy będą potrzebne.

Dodać o storybook
