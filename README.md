# Időpontfoglaló — beágyazható foglalási rendszer

Egyetlen, statikus fájlokból álló (nincs backend, nincs build lépés)
időpontfoglaló widget, amit tetszőleges számú ügyfél weboldalába
be lehet ágyazni (fodrászat, fogászat, edző, stb.). Minden ügyfél
saját "business ID"-t kap, saját szolgáltatásokkal és
nyitvatartással — az adatok Firebase Firestore-ban tárolódnak.

## Fájlstruktúra

```
idopontfoglalo/
├── index.html          → áttekintő oldal
├── booking.html         → a beágyazható foglalási widget (ez megy iframe-be)
├── admin.html            → admin felület (vállalkozás tulajdonosának)
├── css/style.css         → stílusok (CSS változókkal testreszabható)
├── js/
│   ├── firebase-config.js  → ide kerülnek a saját Firebase kulcsaid
│   ├── booking.js           → a foglalási widget logikája
│   └── admin.js              → az admin felület logikája
└── firestore.rules       → Firestore biztonsági szabályok
```

## 1. Firebase projekt létrehozása

1. Menj a [Firebase Console](https://console.firebase.google.com)-ra, hozz létre egy
   új projektet (pl. `idopontfoglalo`).
2. **Firestore Database** → hozz létre egy adatbázist (production mode).
3. **Authentication** → Sign-in method → engedélyezd az **Email/Password**
   bejelentkezést (ezzel lépnek be az admin felhasználók, azaz a
   vállalkozás-tulajdonosok).
4. **Project settings → General → Your apps** → adj hozzá egy Web appot,
   és másold ki a `firebaseConfig` objektumot.
5. Illeszd be a kimásolt adatokat a `js/firebase-config.js` fájlba.
6. **Firestore → Rules** fülön másold be a `firestore.rules` fájl tartalmát,
   majd publikáld.

## 2. Egy új ügyfél (vállalkozás) felvétele

Nincs szükség kézi adatbázis-szerkesztésre: az admin felület
(`admin.html`) beépített varázslóval hozza létre az első belépéskor a
vállalkozást (név + azonosító megadásával). Az azonosító (pl.
`anna-fodraszat`) lesz a `?business=` paraméter értéke a beágyazó
kódban.

Az admin felületen (bejelentkezés után) 4 fül érhető el:
- **Foglalások** — beérkezett foglalások megerősítése / lemondása / törlése
- **Szolgáltatások** — mit lehet foglalni, mennyi ideig tart, mennyibe kerül
- **Nyitvatartás** — heti nyitvatartás naponta + az időpontok
  gyakorisága (pl. 30 percenként)
- **Beágyazás** — kész iframe kód, amit csak be kell másolni az
  ügyfél weboldalába

## 3. Beágyazás az ügyfél weboldalába

```html
<iframe
  src="https://sajat-domained.hu/booking.html?business=anna-fodraszat"
  width="100%"
  height="720"
  style="border:none; max-width:600px;"
  title="Időpontfoglalás">
</iframe>
```

Csak a `business=` értéket kell cserélni ügyfelenként — minden mást a
Firestore-ban tárolt adatok vezérelnek.

## 4. Testreszabás (szín, betűtípus) ügyfelenként

A widget CSS változókon keresztül színezhető. Kétféleképpen adhatod meg:

**A) globálisan, a business dokumentumban** (Firestore-ban, `theme` mező):
```json
{ "theme": { "primary": "#B23A48", "primaryDark": "#8E2C38", "accent": "#E8A33D" } }
```
Ezt egyszerűen hozzáadhatod egy Firestore-ban kézzel, vagy bővítheted az
admin felületet egy szín-választóval (nincs még kész, de a `booking.js`
`applyTheme()` függvénye már beolvassa, ha van).

**B) CSS felülírással a beágyazó oldalon**, ha saját maga töltöd fel a fájlokat.

## 5. Fontos — amit érdemes tudni éles használat előtt

- **Biztonság / adatvédelem**: a `firestore.rules` úgy van beállítva, hogy
  bárki írhat új foglalást (ez kell a nyilvános widgethez), és bárki
  *olvashatja* is a foglalásokat, hogy a rendszer ki tudja szűrni a már
  foglalt időpontokat ütközés-ellenőrzéskor. Ez azt jelenti, hogy technikailag
  bárki, aki ismeri a `businessId`-t, le tudja kérdezni az ügyfelek nevét és
  telefonszámát a foglalásokból. Kis, ismerőseidnek/induló vállalkozásoknak
  ez elfogadható kompromisszum a backend nélküli egyszerűségért cserébe, de
  ha valódi, érzékenyebb ügyféladatokkal (pl. fogászat) dolgozol éles
  környezetben, érdemes később egy Cloud Function mögé tenni az
  ütközés-ellenőrzést, hogy a személyes adatok ne legyenek nyilvánosan
  lekérdezhetők.
- **E-mail/SMS értesítés**: a rendszer jelenleg nem küld automatikus
  visszaigazolást a foglalónak vagy értesítést a vállalkozásnak — ezt egy
  következő lépésben Firebase Cloud Functions + pl. SendGrid/Twilio
  integrációval lehet hozzáadni.
- **Naptári zárva tartás** (pl. ünnepnapok, szabadság): a `closedDates`
  mező a business dokumentumban egy dátum-lista (`"2026-12-24"` formában).
  Ehhez még nincs admin UI, egyelőre Firestore-ban kézzel szerkesztendő —
  könnyen bővíthető az admin felületre, ha kell.
- **Firestore index**: az admin foglalás-listázás `orderBy('date').orderBy('time')`
  kombinált rendezést használ — ha Firestore hibát ad összetett indexre,
  kattints a hibaüzenetben megjelenő linkre, ami automatikusan létrehozza
  a szükséges indexet.

## 6. Helyi tesztelés

Mivel a fájlok `fetch`/modul-jellegű Firebase SDK-t használnak, egyszerű
`file://` megnyitás helyett indíts egy helyi szervert a mappában, pl.:

```bash
npx serve .
# vagy
python3 -m http.server 8000
```

majd nyisd meg a `http://localhost:8000/index.html` címet.
