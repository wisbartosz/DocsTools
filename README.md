<p align="center"><img src="assets/logo.svg" width="160" alt="Żabka w birecie absolwenta"></p>

# Przybornik dyplomowanej Żabki

[English version](README.en.md)

Dodatek do Google Docs, który pomaga pisać pracę dyplomową: odpowiada na pytania na podstawie
Twoich źródeł i sprawdza pracę z wymaganiami uczelni. Siedzi w panelu bocznym dokumentu, a w menu
nazywa się po prostu **PDZ**.

Działa na zwykłym, darmowym koncie Google. Do funkcji AI wystarczy darmowy klucz Gemini z Google
AI Studio – nie trzeba płacić za Gemini ani mieć Google Workspace.

**Przybornik nie pisze pracy za Ciebie i niczego w niej nie zmienia sam z siebie.** Pokazuje miejsca
do poprawy; poprawkę wprowadza dopiero wtedy, gdy klikniesz „Popraw”.

## Jak zacząć

### Nowy dokument z Przybornikiem

Otwórz ten link i kliknij „Utwórz kopię”:

https://docs.google.com/document/d/18DZXa969W9EE75X6z7C3ZNG1ieOqRtMOaDvdnFVoKc4/copy

Kopia ląduje na Twoim Dysku i ma już w sobie Przybornik. Na górze dokumentu jest krótka instrukcja.
Nic nie trzeba instalować na komputerze.

### Masz już dokument z pracą

Otwórz Instalator PDZ, wklej link do swojego dokumentu i kliknij „Zainstaluj”:

https://script.google.com/macros/s/AKfycbw46Frsvuuh_VpBv5G1iSk2KE_flxFaJ6ZClwq51BneFK9qAsxVmA8LBXYlfBNSNcfT/exec

Przy pierwszym użyciu instalator poprosi o włączenie „Google Apps Script API” na Twoim koncie
(https://script.google.com/home/usersettings). To jeden przełącznik, ustawiany raz.
Na kontach firmowych i uczelnianych administrator może blokować takie skrypty.

### Pierwsze uruchomienie

1. PDZ → Otwórz Przybornik dyplomowanej Żabki.
2. Google zapyta o zgodę i ostrzeże, że aplikacja nie jest zweryfikowana – to Twój własny skrypt.
   Wybierz Zaawansowane → Przejdź do… i zezwól.
3. W ustawieniach (⚙ w prawym górnym rogu panelu) wklej link do folderu ze źródłami na Dysku
   (może to być ten sam folder, którego używasz w NotebookLM).
4. Wklej klucz z https://aistudio.google.com/apikey, wybierz model i kliknij „Sprawdź” przy „Połączenie”.
5. W zakładce Źródła kliknij „Przetwórz źródła”.

Do czasu ukończenia tych kroków zakładka Asystent pokazuje je po kolei z przyciskiem do następnego.

Przetworzone teksty trafiają do podfolderu `PDZ – dane` w folderze ze źródłami (sam podfolder nie
jest źródłem). Zmieniony plik źródłowy zostanie przetworzony ponownie, a tekst usuniętego trafi
do kosza.

### Aktualizacje

Przybornik sam sprawdza, czy jest nowsza wersja. Gdy jest, na górze panelu pojawia się pasek
„Jest nowa wersja” z przyciskiem „Zaktualizuj”, który otwiera instalator. Praca, ustawienia
i przetworzone źródła zostają. Gdyby nowa wersja sprawiała kłopoty, w Ustawieniach (karta Panel,
„Wersja”) jest link do instalatora z przyciskiem „Przywróć poprzednią wersję”. Po aktualizacji
odśwież dokument.

## Co potrafi

### Asystent ze źródłami

- **Pytania do źródeł.** Odpowiedź powstaje wyłącznie na podstawie zaznaczonych źródeł, z dosłownym
  cytatem i stroną (gdy ją znamy) przy każdym źródle. Przybornik sam sprawdza, czy cytat naprawdę
  jest w tekście; gdy w źródłach nie ma odpowiedzi, mówi to wprost. Rozmowa działa jak czat,
  a „Kopiuj z przypisami” kopiuje odpowiedź z listą źródeł.
- **Pytanie o fragment pracy.** Zaznacz akapit i kliknij „Dołącz zaznaczony fragment pracy”.
  Bez pytania asystent pokaże, co z fragmentu potwierdzają źródła, czego w nich nie ma i co im
  przeczy. Fragmentu nie przepisuje.
- **Źródła w wielu formatach:** PDF (także skany), Word, ODT, RTF, Dokumenty Google i pliki tekstowe.
  Tekst jest porządkowany (komentarze Worda, wykropkowania, powtarzające się stopki), a numery
  stron ze stopek zostają jako znaczniki do cytatów.

### Sprawdzanie pracy (zakładka „Sprawdź”)

„Sprawdź całą pracę” uruchamia wszystkie moduły i pokazuje przegląd: ile jest do poprawy, ile do
przejrzenia. Kliknięcie uwagi pokazuje miejsce w dokumencie.

| Moduł | Co sprawdza | Poprawka |
|---|---|---|
| Struktura | spis treści, poziomy i numeracja rozdziałów, wymagane części i ich kolejność, słowa kluczowe, długość abstraktu i celu pracy, liczba stron | numeracja rozdziałów, tytuł zapisany zwykłym tekstem → nagłówek |
| Bibliografia i przypisy | przypisy harwardzkie bez pozycji i pozycje bez przypisu, kolejność alfabetyczna, zapis pozycji i przypisów, stare źródła i Wikipedia, cytaty bez przypisu | zapis przypisów, sortowanie bibliografii |
| Tabele, ryciny i załączniki | podpisy i ich miejsce, źródła pod tabelami, numeracja, odwołania w tekście, spis tabel i rycin | przenumerowanie z podglądem, podpis nad tabelą, spis z linkami |
| Styl | forma osobowa, liczby cyfrą czy słownie, czasy we Wstępie i Zakończeniu, zapowiedzi w streszczeniu | tylko wskazania |
| Skróty | skrótowce spoza wykazu skrótów, nieużyte pozycje wykazu, kolejność wykazu, rozwinięcie przy pierwszym użyciu | tylko wskazania |
| Typografia | pojedyncze litery na końcu wiersza, cudzysłowy „…”, półpauzy, wielokropek, zbędne spacje | pojedynczo albo „Popraw wszystkie” |
| Formatowanie | czcionka, rozmiar, interlinia, wyrównanie, wcięcie, marginesy, A4, tytuły rozdziałów, podpisy, rozdział od nowej strony | formatowanie i wielkość liter w tytułach |

Uwagi „do przejrzenia”, które są w porządku, możesz **ukryć** (pojedynczo albo całą grupę). Ukryta
uwaga wraca sama, gdy zmienisz tekst akapitu, a „Przywróć wszystkie ukryte” cofa wszystko.
**Strona tytułowa** od uczelni jest pomijana – wszystko przed pierwszym podziałem strony
(można to wyłączyć).

### Wymagania uczelni

Domyślne wymagania formatowania i struktury pochodzą z regulaminu i poradnika uczelni, dla której
powstał Przybornik. Jeśli piszesz gdzie indziej, zmień je na ekranie „Wymagania uczelni” albo
kliknij „Wczytaj ze źródeł” – Gemini wypełni je z regulaminu wśród Twoich źródeł, a Ty sprawdzasz
wynik przed zapisem. Wymagania zapisują się w dokumencie, więc każda praca może mieć własne.

### Wygoda

- **„Powiększ”** w stopce otwiera Przybornik w dużym, pływającym oknie – wygodniejszym od wąskiego panelu.
- **Polski i angielski interfejs**, wybierany według konta Google albo w ustawieniach.
- **„Zgłoś uwagę”** w stopce wysyła wiadomość prosto do autora, bez konta na GitHubie.

## Dobrze wiedzieć

**Darmowy Gemini bywa przeciążony**, zwłaszcza wieczorem i przy najnowszych modelach Flash.
Przybornik wtedy sam próbuje modeli zapasowych i pisze o tym przy odpowiedzi; gdy przeciążone są
wszystkie, spróbuj za kilka minut. Wybieraj modele z grupy „Polecane”. Płatny plan w AI Studio
z limitem wydatków to grosze za pytanie i zwykle mniej przeciążeń.

**Dane a darmowy plan.** Na darmowym planie Google może wykorzystywać wysłane treści do ulepszania
usług. Przybornik przypomina o tym przy pierwszym użyciu AI i wysyła tylko to, czego potrzebuje
dana funkcja. Nie wysyłaj danych poufnych.

**Numery stron** w cytatach są znane tylko wtedy, gdy plik miał powtarzające się stopki z numerami.
W pozostałych przypadkach (np. Word) odwołanie wskazuje plik i rozdział.

**Klucz API** zapisuje się w ustawieniach Twojego konta Google, nie w dokumencie – inne osoby
z dostępem do dokumentu go nie zobaczą.

### Uprawnienia

| Uprawnienie | Do czego jest potrzebne |
|---|---|
| `documents.currentonly` | praca tylko z bieżącym dokumentem |
| `drive.readonly` | czytanie plików z folderu źródeł |
| `drive.file` | zapisywanie własnych plików dodatku (teksty źródeł); nie daje dostępu do innych plików |
| `script.external_request` | połączenie z Gemini i pobieranie tekstu z Dysku |
| `script.container.ui` | menu i panel boczny |

## Co planujemy

- dziennik użycia AI, przydatny do oświadczenia o korzystaniu z AI,
- karty źródeł ze streszczeniem i najważniejszymi tezami,
- wyszukiwarka w źródłach,
- dodawanie pozycji bibliografii po numerze DOI lub ISBN,
- wykrywanie fragmentów zbyt blisko przepisanych ze źródeł,
- różne nazwy tego samego pojęcia i uwagi redakcyjne (za długie zdania, powtórzenia),
- pytania, jakie mógłby zadać promotor, i porównanie celów pracy z wnioskami,
- licznik postępu.

## Dla programistów

Kod leży w `src` (Apps Script V8, pliki celowo płasko) i jest przypięty do dokumentu – każdy
dokument ma własną kopię.

**Wgranie do dokumentu.** `clasp push -f` z plikiem `.clasp.json` (wzór w `.clasp.json.example`;
identyfikator skryptu: Rozszerzenia → Apps Script → Ustawienia projektu). Wymaga włączonego
„Google Apps Script API” na https://script.google.com/home/usersettings. Gdy clasp jest zablokowany
(konta firmowe): w edytorze skryptów odtwórz każdy plik z `src` pod tą samą nazwą bez końcówki
i podmień `appsscript.json` (Ustawienia projektu → „Pokaż plik manifestu”). Nie poprawiaj kodu
w edytorze – następne wgranie nadpisze zmiany.

**Czego nie widać od razu w kodzie:**

- Każdy napis widoczny dla użytkownika jest w `Messages.js` w obu językach (`t_('klucz')`,
  w panelu `t('klucz')`).
- `Client*.html` to czysty JavaScript bez znaczników. `Sidebar.html` wstawia je dosłownie do jednego
  `<script>` przez `includeScript_`, w swojej kolejności – nowy plik trzeba tam dopisać.
- Moduły biorą źródła z `getReadySources_()`, nie bezpośrednio z indeksu.
- PDF-y i Word są konwertowane do Dokumentu Google (z rozpoznawaniem tekstu) i eksportowane do
  tekstu, każde źródło w osobnym wywołaniu (limit Apps Script ~6 minut). Zmiana w czyszczeniu
  tekstu = podbij `TEXT_PIPELINE_VERSION` w `TextClean.js`, a źródła przetworzą się ponownie.

**Instalator** (`installer/`) to osobny skrypt opublikowany jako aplikacja internetowa, działający
w imieniu osoby, która go otwiera. Musi być połączony z własnym projektem Google Cloud z włączonym
Apps Script API. Wersję bierze z `latest.json` na `main`, kod z archiwum wskazanego tam tagu
(tylko `src`), a przed podmianą zapisuje bieżący kod jako wersję „PDZ backup”. Gdy zepsuta wersja
nie otwiera nawet panelu, instalator działa też z parametrem `?scriptId=<identyfikator skryptu>`.

**Usługa uwag** (`feedback/`) działa na koncie autora i wysyła wiadomości mailem na to samo konto.
Własna kopia Przybornika potrzebuje własnej usługi: publikacja (dostęp: każdy, także anonimowo;
uruchamianie: jako ja), raz `sendTestMessage` w edytorze, adres w `FEEDBACK_URL` w `src/Feedback.js`.

## Prywatność i licencja

Co Przybornik zapisuje i co wysyła, opisuje [polityka prywatności](PRIVACY.md).

MIT, szczegóły w pliku [LICENSE](LICENSE).
