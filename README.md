# Przybornik dyplomowanej Żabki

[English version](README.en.md)

Dodatek do Google Docs, który pomaga pisać pracę dyplomową. Siedzi w panelu bocznym
dokumentu i korzysta ze źródeł, które trzymasz w jednym folderze na Dysku Google
(tym samym, którego możesz używać w NotebookLM).

Działa na zwykłym, darmowym koncie Google. Do funkcji AI potrzebny jest tylko darmowy
klucz Gemini z Google AI Studio. Nie trzeba płacić za Gemini ani mieć Google Workspace.

W menu dokumentu dodatek nazywa się po prostu **PDZ**.

## Co już działa

- Ustawienia w panelu: folder ze źródłami, klucz Gemini, wybór modelu i test połączenia.
- Polski i angielski interfejs. Dodatek sam wybiera język według ustawień konta Google,
  a w ustawieniach można go zmienić.
- Przetwarzanie źródeł. Dodatek wyciąga tekst z PDF-ów (także skanów), plików Word,
  ODT, RTF, Dokumentów Google i plików tekstowych. Przy okazji go porządkuje: usuwa
  komentarze z Worda, wykropkowania z formularzy i powtarzające się stopki. Jeśli stopki
  zawierały numery stron, w tekście zostają znaczniki stron, żeby później dało się
  wskazać, skąd pochodzi dany fragment.

## Co planujemy

Dodatek nie pisze pracy za Ciebie. Ma pomagać ją sprawdzać i pracować ze źródłami.

- asystent, który odpowiada na pytania wyłącznie na podstawie Twoich źródeł i podaje plik,
- dziennik użycia AI, przydatny do oświadczenia o korzystaniu z AI,
- karty źródeł ze streszczeniem i najważniejszymi tezami,
- sprawdzanie, czy zaznaczone twierdzenia mają pokrycie w źródłach,
- wyszukiwarka w źródłach,
- kontrola formatowania i polskiej typografii (twarde spacje, cudzysłowy, półpauzy),
- kontrola bibliografii, także dodawanie pozycji po numerze DOI lub ISBN,
- wykrywanie fragmentów zbyt blisko przepisanych ze źródeł,
- spójność terminologii, numeracja rysunków i tabel, uwagi redakcyjne,
- pytania, jakie mógłby zadać promotor, i porównanie celów pracy z wnioskami,
- licznik postępu i zgłaszanie uwag o dodatku,
- prostsza instalacja: gotowy dokument do skopiowania jednym kliknięciem, aktualizacje
  z poziomu panelu i skrypt instalacyjny dla Windowsa i Maca.

Zasada jest jedna: dodatek niczego nie zmienia w treści pracy sam z siebie. Pokazuje
miejsca do poprawy, a poprawki formatowania wprowadza tylko wtedy, gdy klikniesz.

## Instalacja

Kod dodatku jest przypięty do konkretnego dokumentu. Każdy dokument, w którym chcesz
go używać, dostaje własną kopię. Są dwa sposoby, żeby ją tam wgrać.

### Przez clasp (wygodniej)

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

### Ręcznie

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
3. W zakładce Ustawienia wklej link do folderu ze źródłami.
4. Wklej klucz z https://aistudio.google.com/apikey, wybierz model i kliknij
   „Testuj połączenie”.
5. W zakładce Źródła kliknij „Przetwórz źródła”.

Przetworzone teksty lądują w podfolderze `PDZ – dane` wewnątrz folderu ze źródłami.
Ten podfolder nie jest traktowany jako źródło. Jeśli usuniesz jakiś plik ze źródeł,
przy następnym przetwarzaniu jego tekst trafi do kosza. Gdy zmienisz plik źródłowy,
dodatek oznaczy go do ponownego przetworzenia.

## Kilka rzeczy, o których warto wiedzieć

**Darmowy Gemini bywa wolny.** Zwłaszcza najnowsze modele i aliasy typu
`gemini-flash-latest` potrafią długo nie odpowiadać albo zwracać błąd przeciążenia.
Lepiej wybrać konkretną wersję modelu z listy. Limity zapytań sprawdzisz w AI Studio.

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
- `TextClean.js`: czyszczenie tekstu i wykrywanie stron. Bez wywołań Google, więc
  da się je uruchomić i sprawdzić lokalnie w Node.
- `Sidebar.html`, `Styles.html`, `Client.html`: panel boczny.

Teksty z PDF-ów i Worda powstają przez konwersję kopii pliku do Dokumentu Google
(z rozpoznawaniem tekstu po polsku) i eksport do zwykłego tekstu. Kopia jest od razu
usuwana. Każde źródło przetwarza się w osobnym wywołaniu, bo Apps Script ma limit
około 6 minut na jedno wywołanie.

Przy każdej zmianie w czyszczeniu tekstu podbij `TEXT_PIPELINE_VERSION` w
`TextClean.js`. Dodatek sam oznaczy wtedy źródła do ponownego przetworzenia.
