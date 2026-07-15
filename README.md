# Időpontfoglaló (Appointment Booking)

**Language / Nyelv:** [English](#english) · [Magyar](#magyar)

---

## English

> An embeddable, **multi-tenant appointment-booking widget** — with no backend development.

A single booking system you can embed via iframe for any service provider (hairdresser, dentist, personal trainer, etc.). Each client gets its own **business ID**, with its own services and opening hours. Bookings are conflict-free: the system uses slot locking to filter out already-taken time slots. Data is stored in Firebase, so no server-side code is needed.

### Two apps in one system

#### 1. Public booking widget — `booking.html`
An embeddable, multi-step booking wizard:

1. Pick a **service** (name, price, duration).
2. **Date and time** — a monthly calendar plus the free time slots generated for that day (based on opening hours and the service's duration).
3. Enter **details**.
4. **Confirm.**

Highlights: automatically skips **taken/locked** slots (no double booking), **customisable colours** from the URL (theme), and the whole UI is namespaced with `if-` prefixed classes so it won't clash with the host page's styles inside an iframe.

#### 2. Admin interface — `admin.html`
The business owner's control panel:

- **Sign-in** (Firebase Authentication).
- A **setup wizard** on first use (create the business).
- Tabs:
  - **Appointments** — manage incoming bookings, status (`pending` → `confirmed` / `cancelled`); cancelling releases the locked slot.
  - **Services** — add/remove (name, price, duration in minutes).
  - **Opening hours** — set daily opening times.
  - **Embed code** — a ready-to-copy iframe snippet.

### Data model (Firestore)

| Collection | Contents |
| --- | --- |
| `businesses` | businesses: services, opening hours, theme |
| `appointments` | bookings, with status |
| `slotLocks` | slot locks for conflict-free booking |

### Embedding

```html
<iframe
  src="https://your-domain.com/booking.html?business=anna-hair-salon"
  width="100%"
  height="720"
  style="border:none; max-width:600px;"
  title="Appointment booking"></iframe>
```

### Tech stack

- **Vanilla HTML / CSS / JavaScript** — no framework, no build step; `if-` prefixed, iframe-safe CSS.
- **Firebase** — Authentication (admin) and Cloud Firestore (data).
- **Google Fonts:** Inter + JetBrains Mono.
- Includes `firestore.rules` for security rules.

### Project structure

```
Idopontfoglalo/
├── index.html              # demo / setup landing + embed example
├── booking.html            # public booking widget (iframe)
├── admin.html              # business admin interface
├── css/style.css           # design (if- namespace)
├── js/booking.js           # booking wizard, calendar, slot logic
├── js/admin.js             # login, setup wizard, bookings/services/hours
├── js/firebase-config.js   # Firebase project configuration
└── firestore.rules         # Firestore security rules
```

### Setup

1. Create a **Firebase project**; enable **Authentication → Email/Password** and **Cloud Firestore**.
2. Fill in `js/firebase-config.js` with your own project details:
   ```js
   const firebaseConfig = {
     apiKey: "…",
     authDomain: "…",
     projectId: "…",
     // …
   };
   ```
3. Deploy the included **`firestore.rules`**.
4. Open **`admin.html`**, register/sign in, and use the setup wizard to create the business (business ID, services, opening hours).
5. Copy the iframe snippet from the **Embed code** tab onto the provider's website.

> **Security:** the Firebase web `apiKey` is not a secret — data is protected by Firestore rules, so deploying `firestore.rules` correctly is essential.

---

## Magyar

> Beágyazható, **több-vállalkozásos (multi-tenant) időpontfoglaló widget** — backend fejlesztés nélkül.

Egyetlen, iframe-be ágyazható foglalási rendszer bármilyen szolgáltatónak (fodrász, fogász, személyi edző stb.). Minden ügyfél saját **business ID**-t kap, saját szolgáltatásokkal és nyitvatartással. A foglalások ütközésmentesek: a rendszer időpont-zárolással (slot lock) kiszűri a már foglalt sávokat. Az adatok Firebase-ben tárolódnak, így nincs szükség szerveroldali kódra.

### Két alkalmazás egy rendszerben

#### 1. Nyilvános foglaló — `booking.html`
Iframe-be ágyazható, többlépéses foglalási varázsló:

1. **Szolgáltatás** kiválasztása (név, ár, időtartam).
2. **Dátum és időpont** — havi naptár + az adott napra generált szabad idősávok (a nyitvatartás és a szolgáltatás időtartama alapján).
3. **Adatok** megadása.
4. **Megerősítés.**

Jellemzők: automatikusan kihagyja a **foglalt/zárolt** idősávokat (nincs dupla foglalás), URL-ből **testreszabható színek** (téma), és az egész felület `if-` prefixű osztályokkal namespace-elt, hogy iframe-ben ne ütközzön a beágyazó oldal stílusával.

#### 2. Admin felület — `admin.html`
A vállalkozás tulajdonosának kezelőfelülete:

- **Bejelentkezés** (Firebase Authentication).
- **Beállító varázsló** az első használatkor (business létrehozása).
- Fülek:
  - **Foglalások** — beérkező foglalások kezelése, státusz (`pending` → `confirmed` / `cancelled`); lemondáskor a zárolt idősáv felszabadul.
  - **Szolgáltatások** — hozzáadás/törlés (név, ár, időtartam percben).
  - **Nyitvatartás** — napi nyitvatartási idők beállítása.
  - **Beágyazó kód** — készen másolható iframe-snippet.

### Adatmodell (Firestore)

| Gyűjtemény | Tartalom |
| --- | --- |
| `businesses` | vállalkozások: szolgáltatások, nyitvatartás, téma |
| `appointments` | foglalások, státusszal |
| `slotLocks` | időpont-zárolások az ütközésmentességhez |

### Beágyazás

```html
<iframe
  src="https://sajat-domain.hu/booking.html?business=anna-fodraszat"
  width="100%"
  height="720"
  style="border:none; max-width:600px;"
  title="Időpontfoglalás"></iframe>
```

### Technológia

- **Vanilla HTML / CSS / JavaScript** — keretrendszer és build lépés nélkül; `if-` prefixű, iframe-biztos CSS.
- **Firebase** — Authentication (admin) és Cloud Firestore (adatok).
- **Google Fonts:** Inter + JetBrains Mono.
- Mellékelt `firestore.rules` a biztonsági szabályokhoz.

### Fájlszerkezet

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

### Beüzemelés

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
