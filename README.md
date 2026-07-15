# Időpontfoglaló

> Beágyazható, **több-vállalkozásos (multi-tenant) időpontfoglaló widget** — backend fejlesztés nélkül.

Egyetlen, iframe-be ágyazható foglalási rendszer bármilyen szolgáltatónak (fodrász, fogász, személyi edző stb.). Minden ügyfél saját **business ID**-t kap, saját szolgáltatásokkal és nyitvatartással. A foglalások ütközésmentesek: a rendszer időpont-zárolással (slot lock) kiszűri a már foglalt sávokat. Az adatok Firebase-ben tárolódnak, így nincs szükség szerveroldali kódra.

---

## Két alkalmazás egy rendszerben

### 1. Nyilvános foglaló — `booking.html`
Iframe-be ágyazható, többlépéses foglalási varázsló:

1. **Szolgáltatás** kiválasztása (név, ár, időtartam).
2. **Dátum és időpont** — havi naptár + az adott napra generált szabad idősávok (a nyitvatartás és a szolgáltatás időtartama alapján).
3. **Adatok** megadása.
4. **Megerősítés.**

Jellemzők: automatikusan kihagyja a **foglalt/zárolt** idősávokat (nincs dupla foglalás), URL-ből **testreszabható színek** (téma), és az egész felület `if-` prefixű osztályokkal namespace-elt, hogy iframe-ben ne ütközzön a beágyazó oldal stílusával.

### 2. Admin felület — `admin.html`
A vállalkozás tulajdonosának kezelőfelülete:

- **Bejelentkezés** (Firebase Authentication).
- **Beállító varázsló** az első használatkor (business létrehozása).
- Fülek:
  - **Foglalások** — beérkező foglalások kezelése, státusz (`pending` → `confirmed` / `cancelled`); lemondáskor a zárolt idősáv felszabadul.
  - **Szolgáltatások** — hozzáadás/törlés (név, ár, időtartam percben).
  - **Nyitvatartás** — napi nyitvatartási idők beállítása.
  - **Beágyazó kód** — készen másolható iframe-snippet.

## Adatmodell (Firestore)

| Gyűjtemény | Tartalom |
| --- | --- |
| `businesses` | vállalkozások: szolgáltatások, nyitvatartás, téma |
| `appointments` | foglalások, státusszal |
| `slotLocks` | időpont-zárolások az ütközésmentességhez |

## Beágyazás

```html
<iframe
  src="https://sajat-domain.hu/booking.html?business=anna-fodraszat"
  width="100%"
  height="720"
  style="border:none; max-width:600px;"
  title="Időpontfoglalás"></iframe>
```

## Technológia

- **Vanilla HTML / CSS / JavaScript** — keretrendszer és build lépés nélkül; `if-` prefixű, iframe-biztos CSS.
- **Firebase** — Authentication (admin) és Cloud Firestore (adatok).
- **Google Fonts:** Inter + JetBrains Mono.
- Mellékelt `firestore.rules` a biztonsági szabályokhoz.

## Fájlszerkezet

```
Idopontfoglalo/
├── index.html              # bemutató / beüzemelési landing + beágyazó példa
├── booking.html            # nyilvános foglaló widget (iframe)
├── admin.html              # vállalkozói admin felület
├── css/style.css           # dizájn (if- namespace)
├── js/booking.js           # foglalási varázsló, naptár, slot-logika
├── js/admin.js             # login, setup wizard, foglalás/szolgáltatás/nyitvatartás
├── js/firebase-config.js   # Firebase projekt konfiguráció
└── firestore.rules         # Firestore biztonsági szabályok
```

## Beüzemelés

1. Hozz létre egy **Firebase projektet**; kapcsold be az **Authentication → E-mail/jelszó** és a **Cloud Firestore** szolgáltatást.
2. Töltsd ki a `js/firebase-config.js` fájlt a saját projekted adataival:
   ```js
   const firebaseConfig = {
     apiKey: "…",
     authDomain: "…",
     projectId: "…",
     // …
   };
   ```
3. Telepítsd (deploy) a mellékelt **`firestore.rules`** szabályokat.
4. Nyisd meg az **`admin.html`**-t, regisztrálj/jelentkezz be, és a beállító varázslóval hozd létre a vállalkozást (business ID, szolgáltatások, nyitvatartás).
5. Másold a **Beágyazó kód** fülről az iframe-snippetet a szolgáltató weboldalára.

> **Biztonság:** a Firebase webes `apiKey` nem titkos érték — az adatokat a Firestore szabályok védik, ezért fontos a `firestore.rules` helyes deployolása.
