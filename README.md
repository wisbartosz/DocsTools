<p align="center"><img src="assets/logo.svg" width="160" alt="Żabka w birecie absolwenta"></p>

# Przybornik dyplomowanej Żabki

[English version](README.en.md)

Dodatek do Google Docs, który pomaga pisać pracę dyplomową. Siedzi w panelu bocznym
dokumentu i korzysta ze źródeł, które trzymasz w jednym folderze na Dysku Google
(tym samym, którego możesz używać w NotebookLM).

Działa na zwykłym, darmowym koncie Google. Do funkcji AI potrzebny jest tylko darmowy
klucz Gemini z Google AI Studio. Nie trzeba płacić za Gemini ani mieć Google Workspace.

W menu dokumentu dodatek nazywa się po prostu **PDZ**.

## Co już działa

- Asystent. Zadajesz pytanie, a odpowiedź powstaje wyłącznie na podstawie zaznaczonych
  źródeł. Każda odpowiedź ma listę źródeł z dosłownym cytatem i stroną (tam, gdzie ją
  znamy). Dodatek sam sprawdza, czy cytat naprawdę jest w tekście źródła. Gdy w źródłach
  nie ma odpowiedzi, asystent mówi to wprost. Nie napisze za Ciebie fragmentu pracy.
  Rozmowa działa jak czat: kolejne pytanie w polu na dole ciągnie otwartą rozmowę,
  „Nowa rozmowa” zaczyna następną, a „Kopiuj z przypisami” kopiuje odpowiedź z listą źródeł.
  Podczas czekania na odpowiedź można
  normalnie korzystać z innych zakładek. Przy długich źródłach do Gemini trafiają tylko
  fragmenty związane z pytaniem, a gdy wybrany model jest przeciążony, Przybornik sam
  przełącza się na zapasowy i pisze o tym przy odpowiedzi.
- Pytanie o fragment pracy. Zaznaczasz akapit w dokumencie i klikasz „Dołącz zaznaczony
  fragment pracy”. Możesz zapytać o niego wprost albo zostawić pole pytania puste. Wtedy
  asystent sprawdzi, co z tego fragmentu potwierdzają źródła, czego w nich nie ma i co
  im przeczy. Fragmentu nie przepisuje ani nie poprawia.
- Zakładka „Sprawdź” (pierwsza w panelu): przycisk „Sprawdź całą pracę” uruchamia po kolei
  wszystkie kontrole i pokazuje przegląd – ile jest do poprawy, ile do przejrzenia i stan każdego
  modułu. Kliknięcie modułu otwiera jego wyniki z filtrami „Do poprawy / Do przejrzenia”.
  Rodzaj pracy (poglądowa / badawcza) wybiera się na górze, a wymagania uczelni są na osobnym
  ekranie „Wymagania uczelni”.
- Styl w zakładce „Sprawdź”: forma osobowa („uważam”, „moim zdaniem”, „przeprowadziłam”),
  liczby do 9 zapisane cyframi i od 10 słownie, czas przeszły w zdaniach o pracy we Wstępie
  i przyszły w Zakończeniu oraz zapowiedzi zamiast treści w streszczeniu. Tylko wskazania,
  bez zmian w tekście; pomija cytaty, przypisy w nawiasach, tabele, bibliografię i aneks.
  Grupy reguł i próg „liczby słownie do 9 albo 10” ustawia się w wymaganiach uczelni (Format).
- Skróty w zakładce „Sprawdź”: skrótowce w tekście (NFZ, PKB, COVID-19) porównane z wykazem
  skrótów – skróty spoza wykazu, nieużyte pozycje wykazu, kolejność wykazu i brak rozwinięcia
  przy pierwszym użyciu. Pomija przypisy w nawiasach, autorów instytucjonalnych z rokiem
  („GUS 2021”), adresy WWW, liczby rzymskie i bibliografię.
- „Ignoruj” przy uwagach „do przejrzenia” (pojedynczo albo całą grupę). Ukryta uwaga trzyma
  się dokładnego tekstu akapitu – gdy go zmienisz, wraca sama. Ukryte nie znikają z oczu:
  moduł pokazuje „Ukryte: N · Pokaż”, a przegląd „+N ukryte” i „Przywróć wszystkie ukryte”.
  Uwag „do poprawy” nie da się ukryć.
- Polska typografia w zakładce „Sprawdź”. Dodatek przegląda treść pracy i przypisy:
  pojedyncze litery bez twardej spacji (a, i, o, u, w, z), proste cudzysłowy zamiast
  „…”, dywizy zamiast półpauz, trzy kropki zamiast wielokropka, podwójne spacje i spacje
  przed przecinkiem czy kropką. Kliknięcie fragmentu pokazuje go w dokumencie. Poprawka
  idzie tylko na kliknięcie, pojedynczo albo „Popraw wszystkie” dla danego rodzaju.
- Formatowanie według wymagań uczelni, też w zakładce „Sprawdź”. Wpisujesz wymagania
  (czcionka, rozmiar, interlinia, wyrównanie, wcięcie, marginesy, A4, wygląd tytułów
  rozdziałów i podrozdziałów, podpisy tabel i rycin, rozdział od nowej strony), a dodatek
  pokazuje akapity, które od nich odbiegają. Poprawki zmieniają tylko formatowanie
  i wielkość liter w tytułach. Wymagania zapisują się w dokumencie, więc każda praca może
  mieć własne. Przycisk „Wczytaj ze źródeł” wypełnia wymagania z regulaminu wśród źródeł
  (przez Gemini); przed zapisem możesz je sprawdzić i poprawić.
- Struktura pracy, też w zakładce „Sprawdź”: czy jest aktualny automatyczny spis treści,
  czy nagłówki mają właściwe poziomy, czy numeracja rozdziałów idzie po kolei (z poprawką
  jednym kliknięciem), czy są wymagane części (Wstęp, Zakończenie, Bibliografia…) we
  właściwej kolejności, ile jest słów kluczowych, jak długi jest abstrakt i cel pracy, ile
  stron ma praca. Wymagania wpisujesz raz albo wczytujesz z regulaminu wśród źródeł
  (tym samym przyciskiem co wymagania edytorskie); zapisują się w dokumencie. Wymagane
  części to pigułki w kolejności – kliknięcie otwiera nazwę, nazwy zamienne (np. „Zakończenie”
  albo „Podsumowanie”), przesuwanie i usuwanie.
- Bibliografia i przypisy, też w zakładce „Sprawdź”. Dodatek odnajduje przypisy
  harwardzkie w tekście – w nawiasie, np. (Kowalski 2019), i w zdaniu, np. „według
  Kowalskiego (2019)” – oraz pozycje w bibliografii. Pokazuje przypisy bez pozycji
  w bibliografii, pozycje, do których nic w tekście się nie odwołuje, kolejność
  alfabetyczną, liczbę pozycji, zapis pozycji (inicjały, kropka po roku, „i in.”, strony,
  data dostępu przy stronach WWW), Wikipedię oraz źródła starsze niż 10 lat. Przycisk
  „Posortuj bibliografię” układa pozycje alfabetycznie i zachowuje ich formatowanie.
  Sprawdza też zapis przypisów według poradnika (kropka po nawiasie, „i in.” przy więcej
  niż dwóch autorach, przecinki i średniki, litery a/b przy roku, liczba autorów zgodna
  z bibliografią) z poprawką po kliknięciu, cytaty bez przypisu i cytaty w kursywie, a do
  przejrzenia pokazuje dłuższe akapity bez przypisu w części teoretycznej, przypisy
  w Wynikach i Dyskusję opartą głównie na nowych pracach.
- Tabele, ryciny i załączniki, też w zakładce „Sprawdź”. Dodatek odnajduje tabele i obrazy
  z podpisami i pokazuje: obiekty bez podpisu albo z podpisem pod spodem, bez źródła
  („Źródło: …” / „Opracowanie własne”), źródła internetowe bez daty dostępu, numerację nie po
  kolei (także „Tabela 2.1”), odwołania w tekście do nieistniejących numerów, obiekty bez
  odwołania, zgodność ze spisem tabel i rycin oraz załączniki bez odwołania „(Załącznik N)”.
  Tabele i ryciny w aneksie są pomijane. Przycisk „Przenumeruj…” przy numeracji pokazuje
  podgląd („Tabela 4 → 3”) i jednym kliknięciem poprawia numery w podpisach, odwołaniach
  w tekście (także w przypisach i komórkach tabel) i w spisie. Odwołań niejednoznacznych
  nie zmienia – pokazuje je do poprawienia ręcznie. „Przenieś nad” przenosi podpis spod
  tabeli lub ryciny nad nią (pojedynczo albo wszystkie naraz), a „Utwórz spis…” / „Odśwież
  spis…” wstawia spis tabel i rycin po bibliografii (albo w miejsce obecnego) z linkami do
  podpisów i szacowanymi numerami stron – Dokumenty nie podają skryptom numeru strony,
  więc trzeba je sprawdzić przed oddaniem.
- Domyślne wymagania formatowania i struktury pochodzą z regulaminu i poradnika uczelni,
  dla której powstał Przybornik. Obowiązują od razu, bez zapisywania. Jeśli piszesz pracę
  na innej uczelni, zmień je w formularzach albo wczytaj ze źródeł. Przycisk „Przywróć
  domyślne” wpisuje do formularza wartości z regulaminu; obowiązują po kliknięciu „Zapisz
  wymagania”, więc przypadkowe kliknięcie niczego nie kasuje.
- Strona tytułowa od uczelni jest bezpieczna. Wszystkie sprawdzenia pomijają
  wszystko przed pierwszym podziałem strony (można to wyłączyć w zakładce „Sprawdź”).
- Przycisk „Powiększ” w stopce otwiera Przybornik w dużym, pływającym oknie. Panel boczny
  w Google Docs ma stałą szerokość, więc przy dłuższej pracy okno jest wygodniejsze.
  W oknie zakładki są w menu po lewej; w „Sprawdź” lista modułów stoi obok wyników,
  w Asystencie lista rozmów jest w menu, a cytaty obok odpowiedzi.
  Okno i panel działają niezależnie: wątki z jednego nie są widoczne w drugim.
- „Zgłoś uwagę” w stopce. Piszesz, co nie działa albo czego brakuje, klikasz „Wyślij”
  i wiadomość trafia prosto do autora. Nie trzeba mieć konta na GitHubie.
- Ustawienia w panelu: folder ze źródłami, klucz Gemini, wybór modelu i test połączenia.
  Zmiany zapisują się od razu (klucz – przyciskiem). Nowy język pojawia się po ponownym
  otwarciu panelu.
- Polski i angielski interfejs. Dodatek sam wybiera język według ustawień konta Google,
  a w ustawieniach można go zmienić.
- Przetwarzanie źródeł. Dodatek wyciąga tekst z PDF-ów (także skanów), plików Word,
  ODT, RTF, Dokumentów Google i plików tekstowych. Przy okazji go porządkuje: usuwa
  komentarze z Worda, wykropkowania z formularzy i powtarzające się stopki. Jeśli stopki
  zawierały numery stron, w tekście zostają znaczniki stron, żeby później dało się
  wskazać, skąd pochodzi dany fragment.

## Co planujemy

Dodatek nie pisze pracy za Ciebie. Ma pomagać ją sprawdzać i pracować ze źródłami.

- dziennik użycia AI, przydatny do oświadczenia o korzystaniu z AI,
- karty źródeł ze streszczeniem i najważniejszymi tezami,
- sprawdzanie, czy zaznaczone twierdzenia mają pokrycie w źródłach,
- wyszukiwarka w źródłach,
- dodawanie pozycji bibliografii po numerze DOI lub ISBN,
- wykrywanie fragmentów zbyt blisko przepisanych ze źródeł,
- przenumerowanie tabel i rycin jednym kliknięciem i generowanie spisu tabel i rycin,
- spójność terminologii, uwagi redakcyjne,
- pytania, jakie mógłby zadać promotor, i porównanie celów pracy z wnioskami,
- licznik postępu.

Zasada jest jedna: dodatek niczego nie zmienia w treści pracy sam z siebie. Pokazuje
miejsca do poprawy, a poprawki formatowania wprowadza tylko wtedy, gdy klikniesz.

## Instalacja

### Najprościej: kopia gotowego dokumentu

Otwórz ten link i kliknij „Utwórz kopię”:

https://docs.google.com/document/d/18DZXa969W9EE75X6z7C3ZNG1ieOqRtMOaDvdnFVoKc4/copy

Kopia ląduje na Twoim Dysku i ma już w sobie Przybornik. Na górze dokumentu jest krótka
instrukcja, co kliknąć dalej. Nic nie trzeba instalować na komputerze.

### Masz już dokument z pracą

Otwórz Instalator PDZ, wklej link do swojego dokumentu i kliknij „Zainstaluj”:

https://script.google.com/macros/s/AKfycbw46Frsvuuh_VpBv5G1iSk2KE_flxFaJ6ZClwq51BneFK9qAsxVmA8LBXYlfBNSNcfT/exec

Przy pierwszym użyciu instalator poprosi o włączenie „Google Apps Script API” na Twoim
koncie (https://script.google.com/home/usersettings). To jeden przełącznik, ustawiany raz.

### Aktualizacje

Przybornik sam sprawdza, czy jest nowsza wersja. Gdy jest, na górze panelu pojawia się
pasek „Jest nowa wersja” z przyciskiem „Zaktualizuj”, przy ikonie ustawień (⚙) kropka,
a w Ustawieniach (karta Panel, „Wersja”) opis zmian i przycisk „Aktualizuj”. Przycisk
otwiera instalator, który podmieni Przybornik w Twoim dokumencie na najnowszą wersję.
Praca, ustawienia i przetworzone źródła zostają. Gdyby nowa wersja sprawiała kłopoty,
w Ustawieniach jest link do instalatora z przyciskiem „Przywróć poprzednią wersję”. Po aktualizacji odśwież
dokument.

Na kontach firmowych i uczelnianych administrator może blokować takie skrypty.

### Dla programistów

Kod dodatku jest przypięty do konkretnego dokumentu. Każdy dokument, w którym chcesz
go używać, dostaje własną kopię. Poniżej dwa sposoby, żeby wgrać ją do istniejącego
dokumentu.

#### Przez clasp

clasp to narzędzie Google, które kopiuje pliki z tego repozytorium do edytora skryptów
dokumentu. Działa tak samo na Windowsie i na Macu. Potrzebne są git i Node.js.

Raz na komputerze:

1. Zainstaluj Node.js (wersja LTS).
   - Windows: instalator z https://nodejs.org
   - Mac: najprościej przez Homebrew, `brew install node`. Instalator z nodejs.org też
     zadziała, ale wtedy `npm install -g` zwykle wymaga `sudo`.
2. Zainstaluj git. Na Windowsie: https://git-scm.com. Na Macu wystarczy wpisać `git`
   w Terminalu, a system sam zaproponuje instalację narzędzi deweloperskich.
3. `npm install -g @google/clasp`
4. `clasp login` i zaloguj się na konto, na którym jest dokument.
5. Włącz „Google Apps Script API” na https://script.google.com/home/usersettings

Na kontach firmowych administrator może blokować clasp. Wtedy zostaje instalacja ręczna.

Pobierz kod do wybranego folderu:

```
git clone https://github.com/wisbartosz/DocsTools.git
cd DocsTools
```

Dla każdego dokumentu:

1. Otwórz dokument, wybierz Rozszerzenia → Apps Script.
2. W edytorze otwórz Ustawienia projektu (zębatka) i skopiuj identyfikator skryptu.
3. Utwórz plik `.clasp.json` na wzór `.clasp.json.example` i wpisz w nim ten identyfikator:
   - Windows (PowerShell): `copy .clasp.json.example .clasp.json`
   - Mac (Terminal): `cp .clasp.json.example .clasp.json`

   Potem otwórz `.clasp.json` w dowolnym edytorze tekstu. Na Macu pliki zaczynające się
   od kropki są w Finderze ukryte, pokażesz je skrótem Cmd + Shift + kropka.
4. Uruchom `clasp push -f`.
5. Odśwież dokument. W menu pojawi się **PDZ**.

Aktualizacja to `git pull`, a potem znowu `clasp push -f`. Nie poprawiaj kodu ręcznie
w edytorze skryptów, bo następne wgranie nadpisze te zmiany.

#### Ręcznie

1. Otwórz dokument, wybierz Rozszerzenia → Apps Script.
2. W Ustawieniach projektu zaznacz „Pokaż plik manifestu appsscript.json w edytorze”.
3. Zastąp zawartość `appsscript.json` plikiem `src/appsscript.json`.
4. Dla każdego pliku `.js` z katalogu `src` utwórz w edytorze plik skryptu o tej samej
   nazwie (bez końcówki) i wklej zawartość. Domyślny `Kod.gs` możesz usunąć.
5. Tak samo z plikami `.html`: `Sidebar`, `Styles` i `Client`.
6. Zapisz i odśwież dokument.

## Pierwsze uruchomienie

1. PDZ → Otwórz Przybornik dyplomowanej Żabki.
2. Google zapyta o zgodę. Pojawi się ostrzeżenie, że aplikacja nie jest zweryfikowana,
   bo to Twój własny skrypt. Wybierz Zaawansowane → Przejdź do… i zezwól.
3. W ustawieniach (ikona ⚙ w prawym górnym rogu panelu) wklej link do folderu ze źródłami.
4. Wklej klucz z https://aistudio.google.com/apikey, wybierz model i kliknij
   „Sprawdź” przy „Połączenie”. Zakładka Asystent pokazuje te kroki po kolei.
5. W zakładce Źródła kliknij „Przetwórz źródła”.

Zakładka Asystent do tego czasu pokazuje te kroki z postępem i przyciskiem do następnego.

Przetworzone teksty lądują w podfolderze `PDZ – dane` wewnątrz folderu ze źródłami.
Ten podfolder nie jest traktowany jako źródło. Jeśli usuniesz jakiś plik ze źródeł,
przy następnym przetwarzaniu jego tekst trafi do kosza. Gdy zmienisz plik źródłowy,
dodatek oznaczy go do ponownego przetworzenia.

## Kilka rzeczy, o których warto wiedzieć

**Darmowy Gemini bywa przeciążony.** Na darmowym planie Google często odrzuca zapytania
z powodu dużego ruchu, zwłaszcza wieczorem polskiego czasu i przy najnowszych modelach
Flash. Przybornik wtedy sam próbuje modeli zapasowych (najpierw Flash-Lite, który zwykle
jest najmniej obciążony), ale gdy przeciążone są wszystkie, trzeba spróbować za kilka
minut. Wybierz model z grupy „Polecane”. Jeśli przeciążenia bardzo przeszkadzają, możesz
w AI Studio włączyć płatny plan z limitem wydatków: przy naszych zapytaniach to grosze
za pytanie, a na płatnym planie przeciążenia zwykle zdarzają się rzadziej. Limity
zapytań sprawdzisz w AI Studio.

**Dane a darmowy plan.** Na darmowym planie Gemini Google może wykorzystywać wysłane
treści do ulepszania swoich usług. Dodatek przypomina o tym przy pierwszym użyciu AI
i wysyła tylko to, czego potrzebuje dana funkcja. Nie wysyłaj danych poufnych.

**Numery stron.** Dodatek zna numery stron tylko wtedy, gdy plik miał powtarzające się
stopki z numerami. W pozostałych przypadkach (np. pliki Word) odwołuje się do pliku
i rozdziału.

**Klucz API** zapisuje się w ustawieniach Twojego konta Google, a nie w dokumencie.
Inne osoby z dostępem do dokumentu go nie zobaczą.

### Uprawnienia

| Uprawnienie | Do czego jest potrzebne |
|---|---|
| `documents.currentonly` | praca tylko z bieżącym dokumentem |
| `drive.readonly` | czytanie plików z folderu źródeł |
| `drive.file` | zapisywanie własnych plików dodatku (teksty źródeł); nie daje dostępu do innych plików |
| `script.external_request` | połączenie z Gemini i pobieranie tekstu z Dysku |
| `script.container.ui` | menu i panel boczny |

## Dla programistów

Kod leży w `src` i działa w Apps Script (V8). Pliki są celowo płasko, bez podkatalogów,
żeby dało się je odtworzyć przy instalacji ręcznej.

- `Menu.js`: menu, panel boczny, nazwa i numer wersji dodatku.
- `Messages.js`: wszystkie teksty widoczne dla użytkownika, po polsku i po angielsku.
  Nowy napis dopisujesz w obu językach, a w kodzie używasz go przez `t_('klucz')`
  (w panelu przez `t('klucz')`).
- `I18n.js`: wybór języka i podstawianie parametrów w tekstach.
- `Config.js`: ustawienia. Klucz i model są przypisane do użytkownika, folder do dokumentu.
- `Gemini.js`: połączenie z Gemini, ponawianie przy błędach 429/5xx, lista modeli.
- `Store.js`: pliki robocze w folderze `PDZ – dane`. Usunięcie oznacza przeniesienie do kosza.
- `Sources.js`: lista źródeł, przetwarzanie, indeks i sprzątanie. Inne moduły powinny
  brać źródła z `getReadySources_()`, a nie bezpośrednio z indeksu.
- `Assistant.js`: asystent. Buduje zapytanie do Gemini z zaznaczonych źródeł, odbiera
  odpowiedź w ustalonym formacie (JSON) i dopasowuje cytaty do źródeł.
- `Quotes.js`: odnajdywanie cytatu w tekście źródła (dokładnie albo w przybliżeniu)
  i ustalanie strony ze znaczników. Bez wywołań Google.
- `Retrieval.js`: wybór fragmentów źródeł związanych z pytaniem, gdy źródła są długie
  (prosty ranking słów, bez wywołań Google).
- `Feedback.js`: wysyłka uwag z panelu do usługi pośredniczącej (`feedback/`).
- `Typography.js`: reguły typografii na zwykłym tekście. Bez wywołań Google.
- `Style.js`: styl – forma osobowa, zapis liczb, czasy we Wstępie i Zakończeniu, zwroty
  w streszczeniu. Wspólna maska (cytaty, przypisy, odwołania, adresy) i czyste funkcje testowalne w Node.
  Reguły stylu (grupy, próg liczb) we właściwościach dokumentu.
- `Abbreviations.js`: skróty – skrótowce w tekście, wykaz skrótów, rozwinięcie przy pierwszym
  użyciu, kolejność wykazu (akapity albo tabela z dwiema kolumnami). Czyste funkcje testowalne w Node.
- `Ignore.js`: ukryte uwagi „do przejrzenia” – klucz z tekstu akapitu (skrót FNV), zapis
  we właściwościach dokumentu (osobno na moduł, w częściach), podział wyników na widoczne
  i ukryte przy budowaniu grup.
- `Check.js`: zakładka „Sprawdź”. Przechodzi po tekście dokumentu i przypisów, pokazuje
  miejsca i nanosi poprawki. Każda poprawka najpierw sprawdza, czy tekst w tym miejscu
  się nie zmienił.
- `Format.js`: wymagania edytorskie (zapisane we właściwościach dokumentu) i sprawdzanie
  formatowania akapitów, tytułów, marginesów i formatu strony.
- `FormatImport.js`: „Wczytaj ze źródeł” – wybiera ze źródeł fragmenty o formatowaniu
  i prosi Gemini o wypełnienie wymagań (JSON), z listą sprzeczności i cytatami.
- `Structure.js`: struktura pracy – spis treści, poziomy i numeracja nagłówków, wymagane
  części, słowa kluczowe, długości, liczba stron (szacunek z układu strony, eksport do PDF tylko blisko minimum). Czyste funkcje są
  testowalne w Node.
- `Figures.js`: tabele, ryciny i załączniki – podpisy, źródła, numeracja, odwołania
  w tekście, spis tabel i rycin, przenumerowanie (`renumberPlan_` – czysta funkcja planu zmian).
  Czyste funkcje są testowalne w Node.
- `Bibliography.js`: bibliografia i przypisy harwardzkie – odnajdywanie przypisów
  i pozycji, dopasowanie, kolejność alfabetyczna, sortowanie, zapis i rozmieszczenie
  przypisów z poprawkami. Czyste funkcje są
  testowalne w Node.
- `TextClean.js`: czyszczenie tekstu i wykrywanie stron. Bez wywołań Google, więc
  da się je uruchomić i sprawdzić lokalnie w Node.
- `Sidebar.html`, `Styles.html`, `Client.html`: panel boczny.

Teksty z PDF-ów i Worda powstają przez konwersję kopii pliku do Dokumentu Google
(z rozpoznawaniem tekstu po polsku) i eksport do zwykłego tekstu. Kopia jest od razu
usuwana. Każde źródło przetwarza się w osobnym wywołaniu, bo Apps Script ma limit
około 6 minut na jedno wywołanie.

Przy każdej zmianie w czyszczeniu tekstu podbij `TEXT_PIPELINE_VERSION` w
`TextClean.js`. Dodatek sam oznaczy wtedy źródła do ponownego przetworzenia.

Instalator (`installer/`) to osobny skrypt Apps Script opublikowany jako aplikacja
internetowa, działający w imieniu osoby, która go otwiera. Musi być połączony z własnym
projektem Google Cloud z włączonym Apps Script API, bo ukryte projekty skryptów w
dokumentach nie pozwalają na zmianę kodu. Najnowszą wersję bierze z pliku `latest.json`
na gałęzi `main`, a kod z archiwum wskazanego tam tagu (tylko katalog `src`). Przed
podmianą zapisuje bieżący kod jako wersję skryptu „PDZ backup”, z której korzysta
przycisk przywracania. Jeśli zepsuta wersja nie otworzy nawet panelu, instalator można
otworzyć ręcznie z parametrem `?scriptId=<identyfikator skryptu dokumentu>`.

Uwagi z panelu trafiają do osobnej małej aplikacji internetowej (`feedback/`). Działa ona
na koncie autora i wysyła każdą wiadomość mailem na to samo konto, więc adres nie
pojawia się w kodzie. Ma limit wiadomości na godzinę i przycina zbyt długie pola. Kto
utrzymuje własną kopię Przybornika, publikuje u siebie własną usługę (dostęp: każdy,
także anonimowo; uruchamianie: jako ja), raz uruchamia w edytorze `sendTestMessage`,
żeby nadać uprawnienia, i wpisuje jej adres w `FEEDBACK_URL` w `src/Feedback.js`.

Wydanie nowej wersji: podbij `APP_VERSION` w `src/Menu.js`, zaktualizuj `latest.json`
(wersja, tag, opis zmian po polsku i angielsku), zrób commit i tag `vX.Y.Z`, wypchnij oba.

## Prywatność i licencja

Co Przybornik zapisuje i co wysyła, opisuje [polityka prywatności](PRIVACY.md).

MIT, szczegóły w pliku [LICENSE](LICENSE).
