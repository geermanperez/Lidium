import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Edit3,
  Eye,
  Gamepad2,
  Heart,
  House,
  IdCard,
  Image as ImageIcon,
  KeyRound,
  Link as LinkIcon,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Newspaper,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  Upload,
  PlusSquare,
  UserPlus,
  UserCircle,
  Users,
} from "lucide-react";
import { gsap } from "gsap";
import "./App.css";

import { API_URL, getToken, saveToken, request } from "./apiClient";

const downloadUrl =
  "https://drive.google.com/file/d/1EoiMS9gUzMtnpqUDRgq-RnY0kAY6klx5/view?usp=sharing";
const updateDownloadUrl =
  "https://drive.google.com/file/d/1MO9nkQUnwGjgMrNGaBcGgw2i1BtbM2fs/view?usp=sharing";
const updateNoticeStorageKey = "latinms-visual-patch-notice-2026-06-05";
const updateNoticeStartDate = "2026-06-05";
const updateNoticeDurationDays = 7;
const showUpdateContent = true;
const discordUrl = "https://discord.gg/MQmemhMfX";
const whatsappUrl = "https://chat.whatsapp.com/GKQyubuq4ml8HMrhUTzr7H?s=sw&p=i&ilr=2";
const gtop100VoteUrl = "https://gtop100.com/MapleStory/server-106094?vote=1";
const newsPageSize = 6;
const socialPostsPageSize = 6;
const emptyNewsForm = {
  id: null,
  titulo: "",
  resumen: "",
  contenido: "",
  categoria: "Eventos",
  imagen_principal: "",
  galeria: [],
  fecha_publicacion: "",
  estado: "Borrador",
  destacada: false,
};

const translations = {
  en: {
    nav: {
      aria: "Main navigation",
      home: "Home",
      news: "News",
      ranking: "Ranking",
      download: "Download",
      voteNx: "Vote NX",
      account: "My Account",
      login: "Sign in",
    },
    hero: {
      eyebrow: "A unique experience for the Latin community",
      title: "Play Maple in a classic, welcoming, truly unforgettable way.",
      copy:
        "LatinMS is built for Latin players and adventurers from anywhere in the world who want an active community, a special atmosphere, and an experience that feels unique from the first login.",
      start: "Start your adventure",
      enter: "Enter your account",
      online: "Server ONLINE",
      offline: "Server OFFLINE",
      playersOnline: "Players online",
      rates: "2x Mesos · 2x Drops · 5x Quests",
      version: "Server version",
    },
    community: {
      kicker: "Official community",
      title: "Join the LatinMS WhatsApp group",
      copy:
        "Scan the QR code and come meet other players, ask questions, share progress, and stay close to the latest server news.",
      action: "Join the group",
      discordAction: "Join Discord",
      imageAlt: "QR code to join the LatinMS WhatsApp community",
    },
    home: {
      statusKicker: "World status",
      statusTitle: "Everything is ready for you to join the adventure",
      highlights: [
        [
          "/2.png",
          "Progress you can feel",
          "Level up, compete, and leave your mark on a live ranking visible to the whole community.",
        ],
        [
          "/3.png",
          "A community with identity",
          "A server made for Latin players, open to anyone in the world who wants to feel part of it.",
        ],
        [
          "/4.png",
          "Quick access to the game",
          "Create your account in minutes and begin your journey without extra steps.",
        ],
      ],
      newsTitle: "Why LatinMS feels different",
      topKicker: "Top players",
      topTitle: "The adventurers setting the pace",
      feedKicker: "Community feed",
      feedTitle: "What is moving in LatinMS",
      socialPosts: [
        ["Staff", "Party Quests are active as a main leveling route. Gather your party and share your progress."],
        ["Ranking", "The top players update live. Your next level can move your profile up the feed."],
        ["Community", "Join WhatsApp or Discord to find a party, trade, and show your character."],
      ],
    },
    newsItems: [
      [
        "/2.png",
        "Party Quests renewed for LatinMS",
        "Party Quests are now a main leveling path from Lv. 10 to 90+. They keep minimum level requirements, no maximum level cap, stronger clear EXP, and better common rewards for party play.",
      ],
      [
        "/4.png",
        "LatinMS v1.0 is now available",
        "If you have an older client, please update before playing. Download LatinMS v1.0 from the download section to enter the server without issues.",
      ],
      [
        "/1.png",
        "A classic adventure with its own identity",
        "LatinMS blends nostalgia, progress, and community in a world designed to feel familiar and different at the same time.",
      ],
      [
        "/4.png",
        "Latin players, global connection",
        "We created a space for players from Latin America and anyone around the world who wants to enjoy Maple with a close community.",
      ],
      [
        "/2.png",
        "Fast start, living world",
        "Jump in, create your account, and explore a server where there are always goals, progress, and people to share the experience with.",
      ],
    ],
    pages: {
      newsTitle: "Latest LatinMS news",
      rankingTitle: "Top server players",
      downloadKicker: "Download",
      downloadTitle: "Download the LatinMS v1.0 client",
      downloadCopy:
        "LatinMS v1.0 client ready to enter the world of LatinMS. Download it, install it, and use your account to begin the adventure.",
      downloadClient: "Download client",
      patchTitle: "Latest visual patch",
      patchCopy:
        "Already have the client? Download this visual patch, unzip it, paste the launcher into your game folder, and replace the previous one when Windows asks.",
      patchDownload: "Download patch",
    },
    updateNotice: {
      kicker: "Required update",
      title: "Download the latest LatinMS visual patch",
      copy:
        "A new visual patch is available. Download it now and replace the launcher so your client shows the latest LatinMS visuals.",
      steps: [
        "Download the visual patch.",
        "Unzip it.",
        "Take the launcher file from the extracted download.",
        "Open your game folder and paste the launcher there.",
        "When Windows asks if you want to replace it, choose Yes.",
      ],
      download: "Download visual patch",
      accept: "Got it, do not show today",
      closeLabel: "Close update notice",
    },
    ranking: {
      level: "Level",
      job: "Job",
      guild: "Guild",
      fame: "Fame",
      origin: "Origin",
      characterAlt: "Character",
      noData: "No data",
      pending: "Ranking pending",
      search: "Search character",
      searchPlaceholder: "Character name",
      viewProfile: "View profile",
      champion: "Ranking champion",
      topOne: "Top 1",
      topThree: "Top 3",
      topTen: "Top 10",
      members: "Members",
      leader: "Leader",
      guildPoints: "GP",
      staff: "Staff",
      beta: "Beta Tester",
      donor: "Donor",
      tabs: {
        level: "Top Level",
        fame: "Top Fame",
        guilds: "Top Guilds",
        bosses: "Top Bosses",
      },
      loading: "Loading ranking...",
      noResults: "No players match this search.",
      noModeData: "This ranking is ready visually, but its endpoint is not connected yet.",
      previous: "Previous",
      next: "Next",
      page: "Page",
    },
    auth: {
      loginKicker: "Sign in",
      loginTitle: "Enter with your account",
      loginIntro:
        "This screen keeps account access separate from the main page. The actual character login happens inside the game client.",
      username: "Username",
      usernamePlaceholder: "Your account",
      password: "Password",
      passwordPlaceholder: "Your password",
      forgotPassword: "Forgot your password?",
      loginButton: "Sign in",
      createAccount: "Create account",
      recoverKicker: "Recover password",
      recoverTitle: "Recover access to your account",
      recoverIntro: "Enter the email associated with your account to start recovery.",
      email: "Email",
      emailPlaceholder: "email@example.com",
      recoverButton: "Recover password",
      backToLogin: "Back to sign in",
      resetKicker: "New password",
      resetTitle: "Create a new password",
      resetIntro: "Enter your new password to recover access to your account.",
      newPassword: "New password",
      repeatNewPassword: "Repeat new password",
      resetButton: "Update password",
      registerKicker: "Create account",
      registerTitle: "Quick registration for LatinMS",
      registerIntro:
        "Form connected to the API so registration stays separate from the main cover page.",
      displayName: "Name",
      displayNamePlaceholder: "Your name",
      passwordMinPlaceholder: "Minimum 4 characters",
      repeatPassword: "Repeat password",
      repeatPasswordPlaceholder: "Repeat the password",
      country: "Country",
      countryPlaceholder: "Select your country",
      birthDate: "Birthday",
      creatingAccount: "Creating account...",
      initialPin: "Initial PIN: 0000",
      initialPic: "Initial PIC: 000000",
    },
    account: {
      kicker: "My Account",
      title: "Your account and profile data",
      needsLogin: "You need to sign in. You will be redirected to sign in.",
      tabsLabel: "My account sections",
      account: "Account",
      profile: "Profile",
      security: "Security",
      characters: "Characters",
      user: "User",
      logout: "Sign out",
      webProfile: "Web profile",
      displayName: "Display name",
      avatarUrl: "Avatar URL",
      bio: "Bio",
      bioPlaceholder: "Tell the LatinMS community who you are, what you play, and what you are looking for.",
      instagram: "Instagram",
      discord: "Discord",
      website: "Website",
      location: "Location",
      yourProfile: "Your social profile",
      editProfile: "Edit profile",
      youBadge: "You",
      topOneBadge: "Top 1 ranking",
      topRankBadge: "Top ranking",
      noBio: "No bio yet. Add one so other players can know you.",
      socialLinks: "Social links",
      mainCharacter: "Main character",
      level: "Level",
      saveProfile: "Save profile",
      changePassword: "Change password",
      currentPassword: "Current password",
      newPassword: "New password",
      repeatNew: "Repeat new password",
      noCharacters: "No characters.",
      administration: "Administration Panel",
      loadingStats: "Loading stats...",
      online: "Online",
      accounts: "Accounts",
      banned: "Banned",
      players: "Players",
      latestAccounts: "Latest accounts",
      latestCharacters: "Latest characters",
    },
    sidebar: {
      shortcuts: "Shortcuts",
      allSet: "All set",
      seeHome: "View home",
      seeNews: "View news",
      seeRanking: "View ranking",
      client: "Client",
      title: "Download the game",
      copy: "Client available so you can start your LatinMS adventure right now.",
      voteAlt: "Vote for us on GTop100",
    },
    messages: {
      serverError: "Could not connect to the server.",
      enterEmail: "Enter your email.",
      recoverySent:
        "If the email exists, we will contact you with the steps to recover your account.",
      recoveryError: "Could not start password recovery.",
      resetTokenMissing: "The recovery link is invalid or incomplete.",
      resetPasswordSuccess: "Password updated. You can now sign in.",
      resetPasswordError: "Could not update the password.",
      loginRequired: "Complete username and password.",
      loginError: "Sign-in error",
      connectionError: "Connection error",
      voteLoginRequired: "Sign in before voting so the NX can be credited to your account.",
      requiredFields: "Complete all fields.",
      passwordMismatch: "Passwords do not match.",
      registerError: "Could not create the account.",
      registerSuccess: "Account created successfully. You can now enter the game.",
      apiConnectionError: "API connection error.",
      loadAccountError: "Error loading data",
      profileUpdated: "Profile updated",
      profileUpdateError: "Error updating profile",
      passwordUpdated: "Password updated",
      passwordUpdateError: "Error changing password",
    },
  },
  es: {
    nav: {
      aria: "Navegacion principal",
      home: "Inicio",
      news: "Noticias",
      ranking: "Ranking",
      download: "Descarga",
      voteNx: "Vote NX",
      account: "Mi Cuenta",
      login: "Iniciar sesion",
    },
    hero: {
      eyebrow: "Una experiencia unica para la comunidad latina",
      title: "Vive Maple de una forma clasica, cercana y realmente inolvidable.",
      copy:
        "LatinMS esta pensado para jugadores latinos y para aventureros de cualquier parte del mundo que buscan una comunidad activa, una atmosfera especial y una experiencia que se sienta unica desde el primer inicio de sesion.",
      start: "Comienza tu aventura",
      enter: "Entra con tu cuenta",
      online: "Servidor EN LINEA",
      offline: "Servidor FUERA DE LINEA",
      playersOnline: "Jugadores en linea",
      rates: "2x Mesos · 2x Drops · 5x Quests",
      version: "Version del servidor",
    },
    community: {
      kicker: "Comunidad oficial",
      title: "Unite al grupo de WhatsApp de LatinMS",
      copy:
        "Escanea el codigo QR y ven a conocer otros jugadores, resolver dudas, compartir tu progreso y enterarte de las novedades del servidor.",
      action: "Unirse al grupo",
      discordAction: "Unirse al Discord",
      imageAlt: "Codigo QR para unirse a la comunidad de WhatsApp de LatinMS",
    },
    home: {
      statusKicker: "Estado del mundo",
      statusTitle: "Todo listo para sumarte a la aventura",
      highlights: [
        [
          "/2.png",
          "Progreso que se siente",
          "Sube de nivel, compite y deja tu marca en un ranking vivo y visible para toda la comunidad.",
        ],
        [
          "/3.png",
          "Comunidad con identidad",
          "Un servidor pensado para jugadores latinos, abierto a cualquier persona del mundo que quiera sentirse parte.",
        ],
        [
          "/4.png",
          "Acceso rapido al juego",
          "Crea tu cuenta en minutos y empieza tu recorrido sin vueltas ni pasos innecesarios.",
        ],
      ],
      newsTitle: "Por que LatinMS se siente diferente",
      topKicker: "Top de jugadores",
      topTitle: "Los aventureros que marcan el ritmo",
      feedKicker: "Muro de comunidad",
      feedTitle: "Lo que se mueve en LatinMS",
      socialPosts: [
        ["Staff", "Las Party Quests estan activas como ruta principal de leveleo. Arma party y comparte tu progreso."],
        ["Ranking", "El top se actualiza en vivo. Tu proximo nivel puede subir tu perfil en el feed."],
        ["Comunidad", "Entra a WhatsApp o Discord para buscar party, tradear y mostrar tu personaje."],
      ],
    },
    newsItems: [
      [
        "/2.png",
        "Party Quests renovadas en LatinMS",
        "Las Party Quests ahora son una ruta principal de leveleo desde Lv. 10 hasta 90+. Mantienen nivel minimo, ya no tienen nivel maximo, entregan mas EXP por clear y mejores recompensas comunes para jugar en party.",
      ],
      [
        "/4.png",
        "Nueva version LatinMS v1.0 disponible",
        "Si tenes una version vieja del cliente, actualiza antes de jugar. Descarga LatinMS v1.0 desde la seccion de descarga para entrar al servidor sin problemas.",
      ],
      [
        "/1.png",
        "Una aventura clasica con identidad propia",
        "LatinMS mezcla nostalgia, progreso y comunidad en un mundo pensado para sentirse familiar y a la vez distinto.",
      ],
      [
        "/4.png",
        "Jugadores latinos, conexion global",
        "Creamos un espacio para jugadores de Latinoamerica y para cualquier persona del mundo que quiera vivir Maple con una comunidad cercana.",
      ],
      [
        "/2.png",
        "Inicio rapido, mundo vivo",
        "Entra, crea tu cuenta y empieza a explorar un servidor donde siempre hay metas, progreso y gente con quien compartir la experiencia.",
      ],
    ],
    pages: {
      newsTitle: "Ultimas novedades de LatinMS",
      rankingTitle: "Top jugadores del servidor",
      downloadKicker: "Descarga",
      downloadTitle: "Descarga el cliente de LatinMS v1.0",
      downloadCopy:
        "Cliente LatinMS v1.0 listo para entrar al mundo de LatinMS. Descargalo, instalalo y usa tu cuenta para comenzar la aventura.",
      downloadClient: "Descargar cliente",
      patchTitle: "Parche visual",
      patchCopy:
        "Ya tienes el cliente? Descarga este parche visual, descomprimilo, pega el launcher en la carpeta del juego y reemplaza el anterior cuando Windows pregunte.",
      patchDownload: "Descargar parche",
    },
    updateNotice: {
      kicker: "Actualizacion necesaria",
      title: "Descarga el ultimo parche visual de LatinMS",
      copy:
        "Hay un nuevo parche visual disponible. Descargalo y reemplaza el launcher para que tu cliente muestre los ultimos visuales de LatinMS.",
      steps: [
        "Descarga el parche visual.",
        "Descomprimila.",
        "Toma el archivo launcher de la descarga extraida.",
        "Abre la carpeta del juego y pega el launcher ahi.",
        "Cuando Windows pregunte si lo quieres reemplazar, elige Si.",
      ],
      download: "Descargar parche visual",
      accept: "Entendido, no mostrar hoy",
      closeLabel: "Cerrar aviso de actualizacion",
    },
    ranking: {
      level: "Nivel",
      job: "Job",
      guild: "Guild",
      fame: "Fama",
      origin: "Origen",
      characterAlt: "Personaje",
      noData: "Sin datos",
      pending: "Ranking pendiente",
      search: "Buscar personaje",
      searchPlaceholder: "Nombre del personaje",
      viewProfile: "Ver perfil",
      champion: "Campeon del ranking",
      topOne: "Top 1",
      topThree: "Top 3",
      topTen: "Top 10",
      members: "Miembros",
      leader: "Lider",
      guildPoints: "GP",
      staff: "Staff",
      beta: "Beta Tester",
      donor: "Donador",
      tabs: {
        level: "Top Level",
        fame: "Top Fame",
        guilds: "Top Guilds",
        bosses: "Top Bosses",
      },
      loading: "Cargando ranking...",
      noResults: "No hay jugadores con esa busqueda.",
      noModeData: "Este ranking ya esta preparado visualmente, pero su endpoint aun no esta conectado.",
      previous: "Anterior",
      next: "Siguiente",
      page: "Pagina",
    },
    auth: {
      loginKicker: "Inicio de sesion",
      loginTitle: "Entra con tu cuenta",
      loginIntro:
        "Esta pantalla mantiene el acceso separado de la pagina principal. El ingreso real al personaje se realiza dentro del cliente del juego.",
      username: "Usuario",
      usernamePlaceholder: "Tu cuenta",
      password: "Contrasena",
      passwordPlaceholder: "Tu contrasena",
      forgotPassword: "Olvidaste la contrasena?",
      loginButton: "Iniciar sesion",
      createAccount: "Crear cuenta",
      recoverKicker: "Recuperar contrasena",
      recoverTitle: "Recupera el acceso a tu cuenta",
      recoverIntro: "Escribe el correo asociado a tu cuenta para iniciar la recuperacion.",
      email: "Correo electronico",
      emailPlaceholder: "correo@ejemplo.com",
      recoverButton: "Recuperar contrasena",
      backToLogin: "Volver al inicio de sesion",
      resetKicker: "Nueva contrasena",
      resetTitle: "Crea una nueva contrasena",
      resetIntro: "Ingresa tu nueva contrasena para recuperar el acceso a tu cuenta.",
      newPassword: "Nueva contrasena",
      repeatNewPassword: "Repetir nueva contrasena",
      resetButton: "Actualizar contrasena",
      registerKicker: "Crear cuenta",
      registerTitle: "Registro rapido para LatinMS",
      registerIntro:
        "Formulario conectado a la API para que el registro no quede mezclado con la portada principal.",
      displayName: "Nombre",
      displayNamePlaceholder: "Tu nombre",
      passwordMinPlaceholder: "Minimo 4 caracteres",
      repeatPassword: "Repetir contrasena",
      repeatPasswordPlaceholder: "Repite la contrasena",
      country: "Pais",
      countryPlaceholder: "Selecciona tu pais",
      birthDate: "Fecha de cumpleanos",
      creatingAccount: "Creando cuenta...",
      initialPin: "PIN inicial: 0000",
      initialPic: "PIC inicial: 000000",
    },
    account: {
      kicker: "Mi Cuenta",
      title: "Datos de tu cuenta y perfil",
      needsLogin: "Necesitas iniciar sesion. Seras redirigido al inicio de sesion.",
      tabsLabel: "Secciones de mi cuenta",
      account: "Cuenta",
      profile: "Perfil",
      security: "Seguridad",
      characters: "Personajes",
      user: "Usuario",
      logout: "Cerrar sesion",
      webProfile: "Perfil web",
      displayName: "Nombre visible",
      avatarUrl: "Avatar URL",
      bio: "Bio",
      bioPlaceholder: "Contale a la comunidad LatinMS quien sos, que jugas y que estas buscando.",
      instagram: "Instagram",
      discord: "Discord",
      website: "Sitio web",
      location: "Ubicacion",
      yourProfile: "Tu perfil social",
      editProfile: "Editar perfil",
      youBadge: "Vos",
      topOneBadge: "Top 1 ranking",
      topRankBadge: "Top ranking",
      noBio: "Todavia no tienes bio. Agrega una para que otros jugadores te conozcan.",
      socialLinks: "Enlaces sociales",
      mainCharacter: "Personaje principal",
      level: "Nivel",
      saveProfile: "Guardar perfil",
      changePassword: "Cambiar contrasena",
      currentPassword: "Contrasena actual",
      newPassword: "Nueva contrasena",
      repeatNew: "Repetir nueva",
      noCharacters: "No hay personajes.",
      administration: "Panel de Administracion",
      loadingStats: "Cargando estadisticas...",
      online: "En linea",
      accounts: "Cuentas",
      banned: "Baneados",
      players: "Jugadores",
      latestAccounts: "Ultimas cuentas",
      latestCharacters: "Ultimos personajes",
    },
    sidebar: {
      shortcuts: "Accesos",
      allSet: "Todo en orden",
      seeHome: "Ver inicio",
      seeNews: "Ver noticias",
      seeRanking: "Ver ranking",
      client: "Cliente",
      title: "Descarga el juego",
      copy: "Cliente disponible para que empieces tu aventura en LatinMS ahora mismo.",
      voteAlt: "Votanos en GTop100",
    },
    messages: {
      serverError: "No se pudo conectar con el servidor.",
      enterEmail: "Ingresa tu correo electronico.",
      recoverySent:
        "Si el correo existe, te contactaremos con los pasos para recuperar tu cuenta.",
      recoveryError: "No se pudo iniciar la recuperacion de contrasena.",
      resetTokenMissing: "El enlace de recuperacion es invalido o esta incompleto.",
      resetPasswordSuccess: "Contrasena actualizada. Ya puedes iniciar sesion.",
      resetPasswordError: "No se pudo actualizar la contrasena.",
      loginRequired: "Completa usuario y contrasena.",
      loginError: "Error en el inicio de sesion",
      connectionError: "Error de conexion",
      voteLoginRequired: "Inicia sesion antes de votar para que los NX se acrediten a tu cuenta.",
      requiredFields: "Completa todos los campos.",
      passwordMismatch: "Las contrasenas no coinciden.",
      registerError: "No se pudo crear la cuenta.",
      registerSuccess: "Cuenta creada correctamente. Ya puedes entrar al juego.",
      apiConnectionError: "Error de conexion con la API.",
      loadAccountError: "Error al cargar datos",
      profileUpdated: "Perfil actualizado",
      profileUpdateError: "Error al actualizar perfil",
      passwordUpdated: "Contrasena actualizada",
      passwordUpdateError: "Error al cambiar contrasena",
    },
  },
};

const jobNameKeys = {
  0: ["Beginner", "Principiante"],
  100: ["Warrior", "Guerrero"],
  110: ["Fighter", "Luchador"],
  111: ["Crusader", "Cruzado"],
  112: ["Hero", "Heroe"],
  120: ["Page", "Paje"],
  121: ["White Knight", "Caballero blanco"],
  122: ["Paladin", "Paladin"],
  130: ["Spearman", "Lancero"],
  131: ["Dragon Knight", "Dragon Knight"],
  132: ["Dark Knight", "Dark Knight"],
  200: ["Magician", "Mago"],
  210: ["Fire/Poison Wizard", "Mago fuego/veneno"],
  211: ["Fire/Poison Mage", "Hechicero fuego/veneno"],
  212: ["Fire/Poison Archmage", "Archimago fuego/veneno"],
  220: ["Ice/Lightning Wizard", "Mago hielo/rayo"],
  221: ["Ice/Lightning Mage", "Hechicero hielo/rayo"],
  222: ["Ice/Lightning Archmage", "Archimago hielo/rayo"],
  230: ["Cleric", "Clerigo"],
  231: ["Priest", "Sacerdote"],
  232: ["Bishop", "Obispo"],
  300: ["Archer", "Arquero"],
  310: ["Hunter", "Cazador"],
  311: ["Ranger", "Ranger"],
  312: ["Bowmaster", "Bowmaster"],
  320: ["Crossbowman", "Ballestero"],
  321: ["Sniper", "Sniper"],
  322: ["Marksman", "Marksman"],
  400: ["Thief", "Ladron"],
  410: ["Assassin", "Asesino"],
  411: ["Hermit", "Hermit"],
  412: ["Night Lord", "Night Lord"],
  420: ["Bandit", "Bandido"],
  421: ["Chief Bandit", "Chief Bandit"],
  422: ["Shadower", "Shadower"],
  500: ["Pirate", "Pirata"],
  510: ["Brawler", "Brawler"],
  511: ["Marauder", "Marauder"],
  512: ["Buccaneer", "Buccaneer"],
  520: ["Gunslinger", "Gunslinger"],
  521: ["Outlaw", "Outlaw"],
  522: ["Corsair", "Corsair"],
  1000: ["Noblesse", "Noblesse"],
  1100: ["Dawn Warrior", "Dawn Warrior"],
  1110: ["Dawn Warrior", "Dawn Warrior"],
  1111: ["Dawn Warrior", "Dawn Warrior"],
  1112: ["Dawn Warrior", "Dawn Warrior"],
  1200: ["Blaze Wizard", "Blaze Wizard"],
  1210: ["Blaze Wizard", "Blaze Wizard"],
  1211: ["Blaze Wizard", "Blaze Wizard"],
  1212: ["Blaze Wizard", "Blaze Wizard"],
  1300: ["Wind Archer", "Wind Archer"],
  1310: ["Wind Archer", "Wind Archer"],
  1311: ["Wind Archer", "Wind Archer"],
  1312: ["Wind Archer", "Wind Archer"],
  1400: ["Night Walker", "Night Walker"],
  1410: ["Night Walker", "Night Walker"],
  1411: ["Night Walker", "Night Walker"],
  1412: ["Night Walker", "Night Walker"],
  1500: ["Thunder Breaker", "Thunder Breaker"],
  1510: ["Thunder Breaker", "Thunder Breaker"],
  1511: ["Thunder Breaker", "Thunder Breaker"],
  1512: ["Thunder Breaker", "Thunder Breaker"],
  2000: ["Legend", "Leyenda"],
  2100: ["Aran", "Aran"],
  2110: ["Aran", "Aran"],
  2111: ["Aran", "Aran"],
  2112: ["Aran", "Aran"],
};

const fallbackCountryCodes = [
  "AR",
  "BO",
  "BR",
  "CA",
  "CL",
  "CO",
  "CR",
  "DO",
  "EC",
  "ES",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PY",
  "SV",
  "US",
  "UY",
  "VE",
];

const DEFAULT_CHARACTER_IMAGE = "/latinms.png";
const DEFAULT_EQUIPS_BY_GENDER = {
  0: [1040002, 1060002, 1072001],
  1: [1041002, 1061002, 1072001],
};
const DEFAULT_WEAPON = 1302000;
const RANKING_TABS = ["level", "fame", "guilds", "bosses"];
const RANKING_PAGE_SIZE = 12;

// Placeholder-only dataset until the backend exposes a boss-clears ranking.
const rankingEndpointPlaceholders = {
  bosses: [
    { id: "boss-zakum", name: "Zakum Hunters", level: 47, job: "Boss clears", guild_name: "Top semanal", fame: 970 },
    { id: "boss-pap", name: "Papulatus Team", level: 31, job: "Boss clears", guild_name: "Top semanal", fame: 720 },
    { id: "boss-pianus", name: "Pianus Squad", level: 18, job: "Boss clears", guild_name: "Top semanal", fame: 420 },
  ],
};

function getEquippedItemIds(character) {
  const rawEquips = character?.equips ?? character?.equipment ?? character?.items ?? character?.equipped;
  if (!rawEquips) return [];

  if (Array.isArray(rawEquips)) {
    return rawEquips
      .map((item) => Number(typeof item === "object" ? item.itemid ?? item.itemId ?? item.id : item))
      .filter((itemId) => Number.isFinite(itemId) && itemId > 0);
  }

  if (typeof rawEquips === "object") {
    return Object.values(rawEquips)
      .map((item) => Number(typeof item === "object" ? item.itemid ?? item.itemId ?? item.id : item))
      .filter((itemId) => Number.isFinite(itemId) && itemId > 0);
  }

  if (typeof rawEquips === "string") {
    return rawEquips
      .split(/[,\s|]+/)
      .map((item) => Number(item))
      .filter((itemId) => Number.isFinite(itemId) && itemId > 0);
  }

  return [];
}

const getViewFromHash = () => {
  const value = window.location.hash.replace("#", "").split("?")[0];
  if (["news", "ranking", "download", "login", "register", "recover", "reset-password", "account", "profile"].includes(value)) {
    return value;
  }
  return "home";
};

function getProfileTargetFromHash() {
  const [, queryString = ""] = window.location.hash.split("?");
  const params = new URLSearchParams(queryString);
  return {
    id: params.get("id") || "",
    name: params.get("name") || "",
  };
}

function getResetTokenFromHash() {
  const [, queryString = ""] = window.location.hash.split("?");
  return new URLSearchParams(queryString).get("token") || "";
}

function formatVoteRemaining(remainingSeconds) {
  const totalSeconds = Math.max(0, Number(remainingSeconds) || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function formatVoteNextAt(nextVoteAt, language) {
  if (!nextVoteAt) return "";
  const date = new Date(nextVoteAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "es" ? "es-AR" : "en-US", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Argentina/Catamarca",
  }).format(date);
}

function getInitialLanguage() {
  const saved = localStorage.getItem("latinms-language");
  return saved === "es" ? "es" : "en";
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatNewsDate(value, language) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(language === "es" ? "es-AR" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getDateTimeInputValue(value = new Date()) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeNewsHtml(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/<[a-z][\s\S]*>/i.test(raw)) {
    return raw
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${paragraph.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
      .join("");
  }

  const template = document.createElement("template");
  template.innerHTML = raw;
  const allowedTags = new Set(["A", "BR", "EM", "H2", "H3", "H4", "IMG", "LI", "OL", "P", "SPAN", "STRONG", "UL"]);
  const allowedAttrs = {
    A: new Set(["href", "target", "rel"]),
    IMG: new Set(["src", "alt", "title", "width", "height", "loading"]),
  };
  const safeUrl = (url) => /^(https?:|mailto:|\/)/i.test(url || "");

  template.content.querySelectorAll("*").forEach((node) => {
    if (!allowedTags.has(node.tagName)) {
      node.replaceWith(document.createTextNode(node.textContent || ""));
      return;
    }

    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const tagAttrs = allowedAttrs[node.tagName];
      if (!tagAttrs?.has(name)) {
        node.removeAttribute(attr.name);
        return;
      }
      if ((name === "href" || name === "src") && !safeUrl(attr.value)) {
        node.removeAttribute(attr.name);
      }
    });

    if (node.tagName === "A") {
      node.setAttribute("rel", "noopener noreferrer");
      if (!node.getAttribute("target")) node.setAttribute("target", "_blank");
    }
    if (node.tagName === "IMG" && !node.getAttribute("loading")) {
      node.setAttribute("loading", "lazy");
    }
  });

  return template.innerHTML;
}

function getNewsShareUrl(news) {
  const baseUrl = window.location.href.split("#")[0];
  return `${baseUrl}#news?slug=${encodeURIComponent(news?.slug || "")}`;
}

function openShare(provider, news) {
  const url = encodeURIComponent(getNewsShareUrl(news));
  const text = encodeURIComponent(news?.titulo || "LatinMS");
  const shareUrls = {
    whatsapp: `https://wa.me/?text=${text}%20${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
  };
  window.open(shareUrls[provider], "_blank", "noopener,noreferrer");
}

function getNewsSlugFromHash() {
  const [, queryString = ""] = window.location.hash.split("?");
  return new URLSearchParams(queryString).get("slug") || "";
}

async function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
  });
}

async function fileToSquareWebp(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Selecciona una imagen valida.");
  }

  const imageUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = imageUrl;
  });

  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = Math.max(0, Math.floor((image.naturalWidth - side) / 2));
  const sy = Math.max(0, Math.floor((image.naturalHeight - side) / 2));
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const context = canvas.getContext("2d");
  context.drawImage(image, sx, sy, side, side, 0, 0, 1080, 1080);
  URL.revokeObjectURL(imageUrl);

  let quality = 0.86;
  let blob = await canvasToBlob(canvas, quality);
  while (blob && blob.size > 500 * 1024 && quality > 0.42) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }

  if (!blob || blob.size > 500 * 1024) {
    throw new Error("No se pudo comprimir la imagen por debajo de 500 KB.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUrl: String(reader.result || ""), size: blob.size });
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function shouldShowUpdateNotice() {
  if (!showUpdateContent) return false;

  const today = new Date();
  const start = new Date(`${updateNoticeStartDate}T00:00:00`);
  const expires = new Date(start);
  expires.setDate(start.getDate() + updateNoticeDurationDays);

  if (today < start || today >= expires) return false;

  return localStorage.getItem(updateNoticeStorageKey) !== getLocalDateKey(today);
}

function getJobName(job, language) {
  const jobId = Number(job);
  const languageIndex = language === "es" ? 1 : 0;
  const noClass = language === "es" ? "Sin clase" : "No class";

  if (Number.isNaN(jobId)) return job || noClass;
  if (jobNameKeys[jobId]) return jobNameKeys[jobId][languageIndex];
  if (jobId >= 100 && jobId < 200) return language === "es" ? "Guerrero" : "Warrior";
  if (jobId >= 200 && jobId < 300) return language === "es" ? "Mago" : "Magician";
  if (jobId >= 300 && jobId < 400) return language === "es" ? "Arquero" : "Archer";
  if (jobId >= 400 && jobId < 500) return language === "es" ? "Ladron" : "Thief";
  if (jobId >= 500 && jobId < 600) return language === "es" ? "Pirata" : "Pirate";
  if (jobId >= 2100 && jobId < 2200) return "Aran";
  return noClass;
}

function getCharacterImage(character) {
  if (!character || typeof character !== "object") {
    return DEFAULT_CHARACTER_IMAGE;
  }

  const directImage =
    character.avatar_url ??
    character.avatarUrl ??
    character.avatar ??
    character.image ??
    character.character_image ??
    character.characterImage;

  if (typeof directImage === "string" && directImage.trim()) {
    return directImage;
  }

  const skin = Number(character.skin ?? character.skincolor ?? 0);
  const gender = Number(character.gender ?? 0);
  const hair = Number(character.hair);
  const face = Number(character.face);

  if (!Number.isFinite(hair) || !Number.isFinite(face) || hair <= 0 || face <= 0) {
    return DEFAULT_CHARACTER_IMAGE;
  }

  const renderSkin = Number.isFinite(skin) && skin > 0 ? skin : 1;
  const equippedItems = getEquippedItemIds(character);
  const defaultEquips = DEFAULT_EQUIPS_BY_GENDER[gender] ?? DEFAULT_EQUIPS_BY_GENDER[0];
  const renderItems = equippedItems.length > 0 ? equippedItems : [...defaultEquips, DEFAULT_WEAPON];
  const itemPath = [hair, face, ...renderItems].join(",");

  return `https://maplestory.io/api/GMS/83/Character/${renderSkin}/${itemPath}/stand1/0?resize=4`;
}

function getPlayerName(player) {
  return player?.name ?? player?.character_name ?? player?.characterName ?? player?.guildName ?? player?.guild_name ?? "LatinMS";
}

function getPlayerGuild(player) {
  return player?.guild_name ?? player?.guildName ?? player?.guild ?? "";
}

function getPlayerFame(player) {
  const fame = Number(player?.fame ?? player?.fama ?? player?.reputation ?? player?.points ?? 0);
  return Number.isFinite(fame) && fame > 0 ? fame : null;
}

function isGuildRankingItem(player) {
  return player?.type === "guild";
}

function hasTruthyFlag(player, keys) {
  return keys.some((key) => {
    const value = player?.[key];
    return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
  });
}

function getSpecialBadges(player, text) {
  const badges = [];
  const gmLevel = Number(player?.gm ?? player?.gm_level ?? player?.gmLevel ?? 0);

  if (gmLevel > 0 || hasTruthyFlag(player, ["staff", "is_staff", "isStaff", "admin"])) {
    badges.push(text.staff);
  }
  if (hasTruthyFlag(player, ["beta", "beta_tester", "betaTester", "is_beta_tester"])) {
    badges.push(text.beta);
  }
  if (hasTruthyFlag(player, ["donor", "donator", "donador", "is_donor", "isDonor"])) {
    badges.push(text.donor);
  }

  return badges;
}

function getRankBadges(rank, text) {
  if (rank === 1) return [text.topOne, text.topThree, text.topTen];
  if (rank <= 3) return [text.topThree, text.topTen];
  if (rank <= 10) return [text.topTen];
  return [];
}

function getProfileHref(player) {
  const id = player?.id ?? player?.character_id ?? player?.characterId;
  const name = getPlayerName(player);
  const params = new URLSearchParams();
  if (id) params.set("id", id);
  if (name) params.set("name", name);
  return `#profile?${params.toString()}`;
}

function RankingTabs({ activeTab, onTabChange, text }) {
  return (
    <div className="ranking-tabs" role="tablist" aria-label="Ranking categories">
      {RANKING_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          className={activeTab === tab ? "is-active" : ""}
          onClick={() => onTabChange(tab)}
        >
          {text.tabs[tab]}
        </button>
      ))}
    </div>
  );
}

function RankingSearch({ value, onChange, text }) {
  return (
    <label className="ranking-search">
      <span>{text.search}</span>
      <div className="ranking-search__control">
        <Search size={18} />
        <input
          type="search"
          value={value}
          placeholder={text.searchPlaceholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}

function RankingCard({ player, rank, language, text, featured = false, compact = false }) {
  const name = getPlayerName(player);
  const guild = getPlayerGuild(player);
  const fame = getPlayerFame(player);
  const isGuild = isGuildRankingItem(player);
  const displayRank = player?._rankingPosition ?? rank;
  const rankBadges = getRankBadges(displayRank, text);
  const specialBadges = getSpecialBadges(player, text);
  const jobName = getJobName(player?.job, language);
  const memberCount = Number(player?.member_count ?? player?.level ?? 0);
  const capacity = Number(player?.capacity ?? 0);
  const memberLabel = capacity > 0 ? `${memberCount}/${capacity}` : String(memberCount || "-");
  const leaderName = player?.leader_name || player?.leaderName || "";

  return (
    <article className={`ranking-card ranking-card--rank-${Math.min(displayRank, 10)}${featured ? " ranking-card--featured" : ""}${compact ? " ranking-card--compact" : ""}`}>
      <div className="ranking-card__media">
        <strong className="ranking-card__rank">#{displayRank}</strong>
        <div className="ranking-card__avatar">
          <img
            src={getCharacterImage(player)}
            alt={`${text.characterAlt} ${name}`}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/latinms.png";
            }}
          />
        </div>
      </div>

      <div className="ranking-card__body">
        <div className="ranking-card__post-head">
          <span>{displayRank <= 3 ? "Featured post" : "LatinMS post"}</span>
          <small>#{displayRank}</small>
        </div>

        <div className="ranking-card__title">
          <h3>{name}</h3>
          {displayRank === 1 ? <span><Crown size={16} />{text.champion}</span> : null}
        </div>

        <div className="ranking-card__stats">
          {isGuild ? (
            <>
              <span><Users size={15} />{text.members} {memberLabel}</span>
              <span><Trophy size={15} />{text.guildPoints} {fame ?? 0}</span>
              {leaderName ? <span><Crown size={15} />{text.leader} {leaderName}</span> : null}
            </>
          ) : (
            <>
              <span><Sparkles size={15} />{text.level} {player?.level ?? "-"}</span>
              <span><Swords size={15} />{jobName}</span>
              {guild ? <span><Users size={15} />{guild}</span> : null}
              {fame ? <span><Heart size={15} />{fame}</span> : null}
            </>
          )}
        </div>

        <div className="ranking-card__badges">
          {rankBadges.map((badge) => <span key={badge} className="ranking-badge">{badge}</span>)}
          {specialBadges.map((badge) => <span key={badge} className="ranking-badge ranking-badge--special">{badge}</span>)}
        </div>

        <div className="ranking-card__social-row">
          <span><Heart size={15} />{fame ?? 0}</span>
          <span><MessageCircle size={15} />{guild ? 1 : 0}</span>
          <span><Trophy size={15} />#{displayRank}</span>
        </div>

        {!compact && !isGuild ? (
          <a className="ranking-card__link" href={getProfileHref(player)}>
            {text.viewProfile}
            <ArrowRight size={16} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function TopPlayerHighlight({ players, language, text }) {
  if (players.length === 0) return null;

  const [champion, second, third] = players;

  return (
    <div className="ranking-podium">
      {second ? <RankingCard player={second} rank={2} language={language} text={text} /> : null}
      {champion ? <RankingCard player={champion} rank={1} language={language} text={text} featured={(champion._rankingPosition ?? 1) === 1} /> : null}
      {third ? <RankingCard player={third} rank={3} language={language} text={text} /> : null}
    </div>
  );
}

function RankingLoading({ text }) {
  return (
    <div className="ranking-loading" aria-live="polite">
      {[1, 2, 3].map((item) => <span key={item}></span>)}
      <p>{text.loading}</p>
    </div>
  );
}

function RankingPage({
  players,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  currentPage,
  onPageChange,
  loading,
  language,
  text,
}) {
  const feedRef = useRef(null);
  const topPlayers = players.slice(0, 3);
  const feedSource = players.slice(3);
  const totalPages = Math.max(1, Math.ceil(feedSource.length / RANKING_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const feedStart = (safePage - 1) * RANKING_PAGE_SIZE;
  const feedPlayers = feedSource.slice(feedStart, feedStart + RANKING_PAGE_SIZE);

  useEffect(() => {
    if (!feedRef.current || loading) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".ranking-animate",
        { autoAlpha: 0, y: 22, scale: 0.985 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: "power3.out", stagger: 0.07 },
      );
    }, feedRef);

    return () => ctx.revert();
  }, [activeTab, currentPage, loading, players.length, search]);

  useEffect(() => {
    if (currentPage > totalPages) {
      onPageChange(totalPages);
    }
  }, [currentPage, onPageChange, totalPages]);

  return (
    <section className="panel ranking-page" ref={feedRef}>
      <div className="panel__head ranking-page__head">
        <div>
          <span className="panel__kicker">{text.tabs[activeTab]}</span>
          <h2>{translations[language].pages.rankingTitle}</h2>
        </div>
        <Trophy size={24} />
      </div>

      <div className="ranking-toolbar">
        <RankingTabs activeTab={activeTab} onTabChange={onTabChange} text={text} />
        <RankingSearch value={search} onChange={onSearchChange} text={text} />
      </div>

      {loading ? <RankingLoading text={text} /> : null}

      {!loading && players.length > 0 ? (
        <>
          <div className="ranking-animate">
            <TopPlayerHighlight players={topPlayers} language={language} text={text} />
          </div>
          <div className="ranking-feed">
            {feedPlayers.map((player) => (
              <div key={player.id || player.name || player._rankingPosition} className="ranking-animate">
                <RankingCard player={player} rank={player._rankingPosition ?? 1} language={language} text={text} />
              </div>
            ))}
          </div>
          {feedSource.length > RANKING_PAGE_SIZE ? (
            <div className="ranking-pagination" aria-label="Ranking pagination">
              <button type="button" className="button-secondary" onClick={() => onPageChange(Math.max(1, safePage - 1))} disabled={safePage === 1}>
                <ChevronLeft size={16} />
                {text.previous}
              </button>
              <span>{text.page} {safePage} / {totalPages}</span>
              <button type="button" className="button-secondary" onClick={() => onPageChange(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}>
                {text.next}
                <ChevronRight size={16} />
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {!loading && players.length === 0 ? (
        <p className="ranking-empty">{activeTab === "bosses" ? text.noModeData : text.noResults}</p>
      ) : null}
    </section>
  );
}

function RankingPreview({ players, language, text }) {
  return (
    <div className="ranking-preview">
      {players.map((player, index) => (
        <RankingCard key={player.id || player.name || index} player={player} rank={index + 1} language={language} text={text} compact />
      ))}
    </div>
  );
}

function findPlayerProfile(ranking, target) {
  const targetId = Number(target.id);
  const targetName = decodeURIComponent(target.name || "").toLowerCase();

  return ranking
    .map((player, index) => ({ ...player, _rankingPosition: index + 1 }))
    .find((player) => {
      const playerId = Number(player.id ?? player.character_id ?? player.characterId);
      const playerName = getPlayerName(player).toLowerCase();
      return (Number.isFinite(targetId) && playerId === targetId) || (targetName && playerName === targetName);
    }) || null;
}

function PublicPlayerProfile({ player, loading, language, rankingText, accountText, onBack }) {
  if (loading) {
    return <section className="panel player-profile-page"><RankingLoading text={rankingText} /></section>;
  }

  if (!player) {
    return (
      <section className="panel player-profile-page">
        <div className="player-profile-empty">
          <Trophy size={28} />
          <h2>{rankingText.noResults}</h2>
          <button type="button" className="button-secondary" onClick={onBack}>{rankingText.tabs.level}</button>
        </div>
      </section>
    );
  }

  const name = getPlayerName(player);
  const rank = player._rankingPosition;
  const guild = getPlayerGuild(player);
  const fame = getPlayerFame(player);
  const bio = player.bio || accountText.noBio;
  const displayName = player.display_name || name;
  const socialLinks = [
    { icon: AtSign, label: accountText.instagram, value: player.instagram_url, href: normalizeSocialUrl(player.instagram_url, "instagram") },
    { icon: MessageCircle, label: accountText.discord, value: player.discord_url, href: normalizeSocialUrl(player.discord_url, "discord") },
    { icon: LinkIcon, label: accountText.website, value: player.website_url, href: normalizeSocialUrl(player.website_url, "website") },
  ].filter((link) => link.value);

  return (
    <section className="panel player-profile-page">
      <div className="account-social-profile player-public-profile">
        <div className="account-social-profile__cover"></div>
        <div className="account-social-profile__body">
          <div className="account-social-profile__avatar">
            <img
              src={getCharacterImage(player)}
              alt={`${rankingText.characterAlt} ${name}`}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/latinms.png";
              }}
            />
          </div>

          <div className="account-social-profile__main">
            <div className="account-social-profile__headline">
              <div>
                <span>{accountText.yourProfile}</span>
                <h2>{displayName}</h2>
                <small>@{name}</small>
              </div>
              <button type="button" className="button-secondary" onClick={onBack}>
                <ChevronLeft size={16} />
                Ranking
              </button>
            </div>

            <div className="account-profile-badges">
              {rank === 1 ? <span><Crown size={15} />{accountText.topOneBadge}</span> : null}
              {rank && rank > 1 && rank <= 10 ? <span><Trophy size={15} />#{rank} {accountText.topRankBadge}</span> : null}
              {getSpecialBadges(player, rankingText).map((badge) => <span key={badge}><BadgeCheck size={15} />{badge}</span>)}
            </div>

            <div className="account-social-stats">
              <strong>{rank ? `#${rank}` : "-"}<span>Ranking</span></strong>
              <strong>{player.level ?? "-"}<span>{rankingText.level}</span></strong>
              <strong>{fame ?? "-"}<span>{rankingText.fame}</span></strong>
            </div>

            <p className="account-social-profile__bio">{bio}</p>

            <div className="account-social-links">
              <span><Swords size={15} />{getJobName(player.job, language)}</span>
              {guild ? <span><Users size={15} />{guild}</span> : null}
              {player.country ? <span><MapPin size={15} />{player.country}</span> : null}
              {socialLinks.map(({ icon: Icon, label, href, value }) => href.startsWith("http") ? (
                <a key={label} href={href} target="_blank" rel="noreferrer"><Icon size={15} />{label}</a>
              ) : (
                <span key={label}><Icon size={15} />{value}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="player-profile-grid">
        <RankingCard player={player} rank={rank || 1} language={language} text={rankingText} featured={rank === 1} />
        <article className="player-profile-journal">
          <span>{rankingText.tabs.level}</span>
          <h3>{language === "es" ? `${name} en LatinMS` : `${name} on LatinMS`}</h3>
          <p>
            {language === "es"
              ? `${name} forma parte del ranking de LatinMS con nivel ${player.level ?? "-"} como ${getJobName(player.job, language)}.${guild ? ` Representa a ${guild} y sigue subiendo dentro de la comunidad.` : " Este perfil se actualiza con los datos visibles del servidor."}`
              : `${name} is part of the LatinMS ranking at level ${player.level ?? "-"} as ${getJobName(player.job, language)}.${guild ? ` They represent ${guild} and keep climbing inside the community.` : " This profile updates with visible server data."}`}
          </p>
        </article>
      </div>
    </section>
  );
}

function App() {
  const [language, setLanguage] = useState(getInitialLanguage);
  const t = translations[language];
  const [view, setView] = useState(getViewFromHash);
  const [hashLocation, setHashLocation] = useState(() => window.location.hash);
  const [status, setStatus] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [guildRanking, setGuildRanking] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [rankingTab, setRankingTab] = useState("level");
  const [rankingSearch, setRankingSearch] = useState("");
  const [rankingPage, setRankingPage] = useState(1);
  const [socialPosts, setSocialPosts] = useState([]);
  const [socialPostsHasMore, setSocialPostsHasMore] = useState(false);
  const [socialPostsLoading, setSocialPostsLoading] = useState(false);
  const [socialPostDateFrom, setSocialPostDateFrom] = useState("");
  const [socialPostDateTo, setSocialPostDateTo] = useState("");
  const [socialPostForm, setSocialPostForm] = useState({ caption: "", image_url: "", image_name: "" });
  const [socialPostMessage, setSocialPostMessage] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [publicNews, setPublicNews] = useState([]);
  const [publicNewsHasMore, setPublicNewsHasMore] = useState(false);
  const [publicNewsLoading, setPublicNewsLoading] = useState(false);
  const [publicNewsSearch, setPublicNewsSearch] = useState("");
  const [publicNewsCategory, setPublicNewsCategory] = useState("Todas");
  const [publicNewsDateFrom, setPublicNewsDateFrom] = useState("");
  const [publicNewsDateTo, setPublicNewsDateTo] = useState("");
  const [newsCategories, setNewsCategories] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  const [relatedNews, setRelatedNews] = useState([]);
  const [adminNews, setAdminNews] = useState([]);
  const [adminNewsForm, setAdminNewsForm] = useState(() => ({ ...emptyNewsForm, fecha_publicacion: getDateTimeInputValue() }));
  const [adminNewsMessage, setAdminNewsMessage] = useState("");
  const [adminNewsLoading, setAdminNewsLoading] = useState(false);
  const socialComposerRef = useRef(null);
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    birthDate: "",
  });
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [registerMessage, setRegisterMessage] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginMessage, setLoginMessage] = useState("");
  const [recoverForm, setRecoverForm] = useState({ email: "" });
  const [recoverMessage, setRecoverMessage] = useState("");
  const [resetPasswordForm, setResetPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [resetPasswordMessage, setResetPasswordMessage] = useState("");
  const [token, setToken] = useState(() => getToken());
  const [accountData, setAccountData] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [accountTab, setAccountTab] = useState("account");
  const [profileForm, setProfileForm] = useState({
    display_name: "",
    avatar_url: "",
    bio: "",
    instagram_url: "",
    discord_url: "",
    website_url: "",
    location: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [accountMessage, setAccountMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminStats, setAdminStats] = useState(null);
  const [adminOnlinePlayers, setAdminOnlinePlayers] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [showUpdateNotice, setShowUpdateNotice] = useState(shouldShowUpdateNotice);
  const [voteStatus, setVoteStatus] = useState(null);
  const [voteRemainingSeconds, setVoteRemainingSeconds] = useState(0);
  const [voteStatusLoading, setVoteStatusLoading] = useState(false);
  const [voteStarting, setVoteStarting] = useState(false);
  const [voteMessage, setVoteMessage] = useState("");

  const countryOptions = useMemo(() => {
    const regionNames = new Intl.DisplayNames([language], { type: "region" });

    return fallbackCountryCodes
      .map((code) => ({ code, name: regionNames.of(code) || code }))
      .sort((a, b) => a.name.localeCompare(b.name, language));
  }, [language]);

  const topPlayersFallback = useMemo(
    () => [
      {
        name: t.ranking.noData,
        level: "-",
        job: t.ranking.pending,
        guild_name: null,
        country: null,
      },
    ],
    [t.ranking.noData, t.ranking.pending],
  );

  useEffect(() => {
    localStorage.setItem("latinms-language", language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const syncView = () => {
      setView(getViewFromHash());
      setHashLocation(window.location.hash);
    };
    window.addEventListener("hashchange", syncView);
    return () => window.removeEventListener("hashchange", syncView);
  }, []);

  useEffect(() => {
    if (token) {
      void loadAccount();
    }
    // Initial token validation should only run once when the app boots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (view === "account") {
      if (!token) return goToView("login");
      void loadAccount();
    }
    // loadAccount reads the latest auth/profile state and should only rerun on route/token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, token]);

  useEffect(() => {
    if (!token) return;
    void loadVoteStatus();
    // The status is refreshed whenever the authenticated account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || voteStatus?.canVote || voteRemainingSeconds <= 0) return undefined;

    const intervalId = window.setInterval(() => {
      setVoteRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          void loadVoteStatus();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
    // The API remains the source of truth when the visual counter reaches zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, voteStatus?.canVote, voteRemainingSeconds > 0]);

  useEffect(() => {
    const loadStatus = async () => {
      const url = `${API_URL}/status`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        setStatus(data);
      } catch (error) {
        console.error("[status] Error:", { url, error });
        setStatus({ ok: false, message: t.messages.serverError });
      }
    };

    const loadRanking = async () => {
      const rankingUrl = `${API_URL}/ranking`;
      const guildRankingUrl = `${API_URL}/ranking/guilds`;
      setRankingLoading(true);
      try {
        const [rankingRes, guildRankingRes] = await Promise.all([
          fetch(rankingUrl),
          fetch(guildRankingUrl),
        ]);
        const data = await rankingRes.json();
        const guildData = await guildRankingRes.json();

        if (Array.isArray(data)) {
          setRanking(data);
        } else {
          setRanking(Array.isArray(data.ranking) ? data.ranking : []);
        }

        setGuildRanking(Array.isArray(guildData.ranking) ? guildData.ranking : []);
      } catch (error) {
        console.error(`Error loading ranking from ${rankingUrl}`, error);
        setRanking([]);
        setGuildRanking([]);
      } finally {
        setRankingLoading(false);
      }
    };

    void loadStatus();
    void loadRanking();
  }, [t.messages.serverError]);

  useEffect(() => {
    void loadSocialPosts({ reset: true });
    // Social feed refreshes when auth or date filters change so liked_by_me and pagination stay accurate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, socialPostDateFrom, socialPostDateTo]);

  useEffect(() => {
    void loadPublicNews({ reset: true });
    // Public news reloads when search/category/date filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicNewsSearch, publicNewsCategory, publicNewsDateFrom, publicNewsDateTo]);

  useEffect(() => {
    void loadNewsCategories();
  }, []);

  useEffect(() => {
    if (view !== "news") return;
    const slug = getNewsSlugFromHash();
    if (slug) {
      void loadNewsDetail(slug);
    } else {
      queueMicrotask(() => {
        setSelectedNews(null);
        setRelatedNews([]);
      });
    }
  }, [view, hashLocation]);

  function goToView(nextView) {
    window.location.hash = nextView === "home" ? "" : nextView;
  }

  function goToComposer() {
    goToView("home");
    window.setTimeout(() => {
      socialComposerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      socialComposerRef.current?.querySelector("textarea")?.focus();
    }, 120);
  }

  async function loadSocialPosts({ reset = false } = {}) {
    setSocialPostsLoading(true);
    try {
      const offset = reset ? 0 : socialPosts.length;
      const params = new URLSearchParams({
        limit: String(socialPostsPageSize),
        offset: String(offset),
      });
      if (socialPostDateFrom) params.set("desde", socialPostDateFrom);
      if (socialPostDateTo) params.set("hasta", socialPostDateTo);

      const data = await request(`/social/posts?${params.toString()}`);
      const nextPosts = Array.isArray(data.posts) ? data.posts : [];
      setSocialPosts((current) => (reset ? nextPosts : [...current, ...nextPosts]));
      setSocialPostsHasMore(Boolean(data.hasMore));
    } catch (error) {
      console.error("Error loading social posts", error);
      if (reset) setSocialPosts([]);
      setSocialPostsHasMore(false);
    } finally {
      setSocialPostsLoading(false);
    }
  }

  async function loadPublicNews({ reset = false } = {}) {
    setPublicNewsLoading(true);
    try {
      const offset = reset ? 0 : publicNews.length;
      const params = new URLSearchParams({
        limit: String(newsPageSize),
        offset: String(offset),
      });
      if (publicNewsSearch.trim()) params.set("search", publicNewsSearch.trim());
      if (publicNewsCategory && !["Todas", "All"].includes(publicNewsCategory)) {
        params.set("categoria", publicNewsCategory);
      }
      if (publicNewsDateFrom) params.set("desde", publicNewsDateFrom);
      if (publicNewsDateTo) params.set("hasta", publicNewsDateTo);

      const data = await request(`/noticias?${params.toString()}`, { silent: true });
      const nextNews = Array.isArray(data.noticias) ? data.noticias : [];
      setPublicNews((current) => (reset ? nextNews : [...current, ...nextNews]));
      setPublicNewsHasMore(Boolean(data.hasMore));
    } catch (error) {
      if (error.status !== 404) console.error("Error loading news", error);
      if (reset) setPublicNews([]);
      setPublicNewsHasMore(false);
    } finally {
      setPublicNewsLoading(false);
    }
  }

  async function loadNewsCategories() {
    try {
      const data = await request("/noticias/categorias", { silent: true });
      setNewsCategories(Array.isArray(data.categorias) ? data.categorias : []);
    } catch (error) {
      if (error.status !== 404) console.error("Error loading news categories", error);
      setNewsCategories([]);
    }
  }

  async function loadNewsDetail(slug) {
    try {
      const data = await request(`/noticias/${encodeURIComponent(slug)}`);
      setSelectedNews(data.noticia || null);
      setRelatedNews(Array.isArray(data.relacionadas) ? data.relacionadas : []);
      setPublicNews((current) => current.map((item) => item.slug === slug ? { ...item, vistas: data.noticia?.vistas ?? item.vistas } : item));
    } catch (error) {
      console.error("Error loading news detail", error);
      setSelectedNews(null);
      setRelatedNews([]);
    }
  }

  async function loadAdminNews() {
    setAdminNewsLoading(true);
    try {
      const data = await request("/admin/noticias", { silent: true });
      setAdminNews(Array.isArray(data.noticias) ? data.noticias : []);
    } catch (error) {
      if (error.status !== 404) console.error("Error loading admin news", error);
      setAdminNews([]);
    } finally {
      setAdminNewsLoading(false);
    }
  }

  async function loadVoteStatus() {
    setVoteStatusLoading(true);
    try {
      const data = await request("/vote/status", { silent: true });
      setVoteStatus(data);
      setVoteRemainingSeconds(Math.max(0, Number(data?.remainingSeconds) || 0));
      setVoteMessage("");
    } catch (error) {
      console.error("[vote] Could not load vote status", error);
      setVoteStatus(null);
      setVoteRemainingSeconds(0);
      setVoteMessage(language === "es" ? "No se pudo verificar el estado de voto. Intentá nuevamente." : "Could not verify vote status. Please try again.");
    } finally {
      setVoteStatusLoading(false);
    }
  }

  async function handleVoteNx() {
    setLoginMessage("");
    setVoteMessage("");

    if (!token) {
      setLoginMessage(t.messages.voteLoginRequired);
      goToView("login");
      return;
    }

    if (voteStatusLoading || voteStarting || !voteStatus?.canVote) return;

    // Obtener un token seguro del servidor vinculado al account_id real del usuario autenticado.
    // Esto evita que se acrediten NX a una cuenta equivocada por usernames similares.
    setVoteStarting(true);
    try {
      const data = await request("/vote/token", { method: "POST" });
      if (!data?.ok || !data?.token) {
        setLoginMessage(language === "es" ? "No se pudo generar el token de voto. Intenta de nuevo." : "Could not generate vote token. Please try again.");
        return;
      }
      const voteUrl = `${gtop100VoteUrl}&pingUsername=${encodeURIComponent(data.token)}`;
      window.open(voteUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (err.status === 429 && err.body?.code === "VOTE_COOLDOWN") {
        setVoteStatus((current) => ({
          ...current,
          success: true,
          canVote: false,
          nextVoteAt: err.body.nextVoteAt,
          remainingSeconds: err.body.remainingSeconds,
        }));
        setVoteRemainingSeconds(Math.max(0, Number(err.body.remainingSeconds) || 0));
        setVoteMessage(err.body.message);
        return;
      }
      console.error("[vote] Token endpoint failed", err);
      setVoteMessage(language === "es" ? "No se pudo iniciar el voto. Intentá nuevamente." : "Could not start voting. Please try again.");
    } finally {
      setVoteStarting(false);
    }
  }

  const handleSocialPostChange = (event) => {
    setSocialPostForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
      ...(event.target.name === "image_url" ? { image_name: "" } : {}),
    }));
  };

  const handleSocialPostImageFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSocialPostMessage(language === "es" ? "Selecciona una imagen valida." : "Select a valid image.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setSocialPostMessage(language === "es" ? "La imagen no puede superar 3 MB." : "Image must be under 3 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSocialPostForm((current) => ({
        ...current,
        image_url: String(reader.result || ""),
        image_name: file.name,
      }));
      setSocialPostMessage("");
    };
    reader.onerror = () => {
      setSocialPostMessage(language === "es" ? "No se pudo cargar la imagen." : "Could not load the image.");
    };
    reader.readAsDataURL(file);
  };

  const submitSocialPost = async (event) => {
    event.preventDefault();
    setSocialPostMessage("");

    if (!token) {
      setSocialPostMessage(language === "es" ? "Inicia sesion para publicar en el muro." : "Sign in to post on the wall.");
      goToView("login");
      return;
    }

    try {
      await request("/social/posts", {
        method: "POST",
        body: JSON.stringify({
          caption: socialPostForm.caption,
          image_url: socialPostForm.image_url,
        }),
      });
      setSocialPostForm({ caption: "", image_url: "", image_name: "" });
      setSocialPostMessage(language === "es" ? "Post publicado." : "Post published.");
      await loadSocialPosts({ reset: true });
    } catch (err) {
      setSocialPostMessage(err.body?.message || err.message || (language === "es" ? "No se pudo publicar." : "Could not publish."));
    }
  };

  const handleAdminNewsChange = (event) => {
    const { name, value, type, checked } = event.target;
    setAdminNewsForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  async function handleAdminNewsImage(event, field) {
    const file = event.target.files?.[0];
    if (!file) return;

    setAdminNewsMessage(language === "es" ? "Procesando imagen..." : "Processing image...");
    try {
      const processed = await fileToSquareWebp(file);
      setAdminNewsForm((current) => ({
        ...current,
        [field]: processed.dataUrl,
      }));
      setAdminNewsMessage(language === "es" ? `Imagen lista (${Math.round(processed.size / 1024)} KB WebP).` : `Image ready (${Math.round(processed.size / 1024)} KB WebP).`);
    } catch (error) {
      setAdminNewsMessage(error.message || (language === "es" ? "No se pudo procesar la imagen." : "Could not process image."));
    } finally {
      event.target.value = "";
    }
  }

  async function handleAdminGalleryImage(event) {
    const files = Array.from(event.target.files || []).slice(0, 8);
    if (files.length === 0) return;

    setAdminNewsMessage(language === "es" ? "Procesando galeria..." : "Processing gallery...");
    try {
      const processed = [];
      for (const file of files) {
        const result = await fileToSquareWebp(file);
        processed.push(result.dataUrl);
      }
      setAdminNewsForm((current) => ({
        ...current,
        galeria: [...current.galeria, ...processed].slice(0, 8),
      }));
      setAdminNewsMessage(language === "es" ? "Galeria lista en WebP." : "Gallery ready in WebP.");
    } catch (error) {
      setAdminNewsMessage(error.message || (language === "es" ? "No se pudo procesar la galeria." : "Could not process gallery."));
    } finally {
      event.target.value = "";
    }
  }

  function editAdminNews(news) {
    setAdminNewsForm({
      id: news.id,
      titulo: news.titulo || "",
      resumen: news.resumen || "",
      contenido: news.contenido || "",
      categoria: news.categoria || "Eventos",
      imagen_principal: news.imagen_principal || "",
      galeria: Array.isArray(news.galeria) ? news.galeria : [],
      fecha_publicacion: getDateTimeInputValue(news.fecha_publicacion),
      estado: news.estado || "Borrador",
      destacada: Boolean(news.destacada),
    });
    setAccountTab("news");
  }

  function resetAdminNewsForm() {
    setAdminNewsForm({ ...emptyNewsForm, fecha_publicacion: getDateTimeInputValue() });
    setAdminNewsMessage("");
  }

  async function submitAdminNews(event) {
    event.preventDefault();
    setAdminNewsMessage("");
    const payload = {
      ...adminNewsForm,
      fecha_publicacion: adminNewsForm.fecha_publicacion ? new Date(adminNewsForm.fecha_publicacion).toISOString() : new Date().toISOString(),
    };

    try {
      const path = adminNewsForm.id ? `/admin/noticias/${adminNewsForm.id}` : "/admin/noticias";
      const method = adminNewsForm.id ? "PUT" : "POST";
      const data = await request(path, { method, body: JSON.stringify(payload) });
      setAdminNewsMessage(data.message || (language === "es" ? "Noticia guardada." : "News saved."));
      resetAdminNewsForm();
      await loadAdminNews();
      await loadPublicNews({ reset: true });
      await loadNewsCategories();
    } catch (error) {
      setAdminNewsMessage(error.body?.message || error.message || (language === "es" ? "No se pudo guardar la noticia." : "Could not save news."));
    }
  }

  async function deleteAdminNews(id) {
    if (!window.confirm(language === "es" ? "Eliminar esta noticia?" : "Delete this news item?")) return;
    try {
      const data = await request(`/admin/noticias/${id}`, { method: "DELETE" });
      setAdminNewsMessage(data.message || (language === "es" ? "Noticia eliminada." : "News deleted."));
      await loadAdminNews();
      await loadPublicNews({ reset: true });
    } catch (error) {
      setAdminNewsMessage(error.body?.message || error.message || (language === "es" ? "No se pudo eliminar." : "Could not delete."));
    }
  }

  const toggleSocialLike = async (postId) => {
    if (!token) {
      goToView("login");
      return;
    }

    await request(`/social/posts/${postId}/like`, { method: "POST" });
    await loadSocialPosts({ reset: true });
  };

  const submitSocialComment = async (postId) => {
    if (!token) {
      goToView("login");
      return;
    }

    const comment = String(commentDrafts[postId] || "").trim();
    if (!comment) return;

    await request(`/social/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    });
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    await loadSocialPosts({ reset: true });
  };

  function acknowledgeUpdateNotice() {
    localStorage.setItem(updateNoticeStorageKey, getLocalDateKey());
    setShowUpdateNotice(false);
  }

  function handleUpdateDownload() {
    acknowledgeUpdateNotice();
    window.open(updateDownloadUrl, "_blank", "noopener,noreferrer");
  }

  const handleRegisterChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleLoginChange = (event) => {
    setLoginForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleRecoverChange = (event) => {
    setRecoverForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleRecover = async (event) => {
    event.preventDefault();
    setRecoverMessage("");

    if (!recoverForm.email) {
      setRecoverMessage(t.messages.enterEmail);
      return;
    }

    try {
      const data = await request("/password-recovery", {
        method: "POST",
        body: JSON.stringify({ email: recoverForm.email }),
      });
      setRecoverMessage(data.message || t.messages.recoverySent);
      setRecoverForm({ email: "" });
    } catch (err) {
      setRecoverMessage(err.body?.message || err.message || t.messages.recoveryError);
    }
  };

  const handleResetPasswordChange = (event) => {
    setResetPasswordForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setResetPasswordMessage("");

    const resetToken = getResetTokenFromHash();
    if (!resetToken) {
      setResetPasswordMessage(t.messages.resetTokenMissing);
      return;
    }

    try {
      const data = await request("/password-recovery/reset", {
        method: "POST",
        body: JSON.stringify({
          token: resetToken,
          newPassword: resetPasswordForm.newPassword,
          confirmPassword: resetPasswordForm.confirmPassword,
        }),
      });
      setResetPasswordMessage(data.message || t.messages.resetPasswordSuccess);
      setResetPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (err) {
      setResetPasswordMessage(err.body?.message || err.message || t.messages.resetPasswordError);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginMessage("");

    if (!loginForm.username || !loginForm.password) {
      setLoginMessage(t.messages.loginRequired);
      return;
    }

    try {
      const data = await request("/login", {
        method: "POST",
        body: JSON.stringify({ username: loginForm.username, password: loginForm.password }),
      });

      if (data?.token) {
        saveToken(data.token);
        setToken(data.token);
        setLoginForm({ username: "", password: "" });
        setLoginMessage("");
        goToView("account");
      } else {
        setLoginMessage(data.message || t.messages.loginError);
      }
    } catch (err) {
      setLoginMessage(err.body?.message || err.message || t.messages.connectionError);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setRegisterMessage("");

    if (
      !form.username ||
      !form.displayName ||
      !form.email ||
      !form.password ||
      !form.confirmPassword ||
      !form.country ||
      !form.birthDate
    ) {
      setRegisterMessage(t.messages.requiredFields);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setRegisterMessage(t.messages.passwordMismatch);
      return;
    }

    try {
      setLoadingRegister(true);

      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setRegisterMessage(data.message || t.messages.registerError);
        return;
      }

      setRegisterMessage(t.messages.registerSuccess);
      setForm({
        username: "",
        displayName: "",
        email: "",
        password: "",
        confirmPassword: "",
        country: "",
        birthDate: "",
      });
      setStatus((current) =>
        current?.ok ? { ...current, accounts: Number(current.accounts || 0) + 1 } : current,
      );
    } catch {
      setRegisterMessage(t.messages.apiConnectionError);
    } finally {
      setLoadingRegister(false);
    }
  };

  async function loadAccount() {
    setAccountMessage("");
    try {
      const acc = await request("/account/me");
      setAccountData(acc.account || null);
      setProfileForm({
        display_name: acc.profile?.display_name || "",
        avatar_url: acc.profile?.avatar_url || "",
        bio: acc.profile?.bio || "",
        instagram_url: acc.profile?.instagram_url || acc.profile?.instagram || "",
        discord_url: acc.profile?.discord_url || acc.profile?.discord || "",
        website_url: acc.profile?.website_url || acc.profile?.website || "",
        location: acc.profile?.location || "",
      });

      const chars = await request("/account/me/characters");
      setCharacters(chars.characters || []);

      setLoadingAdmin(true);
      try {
        const adm = await request("/admin/stats");
        if (adm.ok) {
          setIsAdmin(true);
          setAdminStats(adm.stats);
          void loadAdminNews();
          try {
            if (!adm.stats?.onlineList && !adm.stats?.onlinePlayers) {
              const online = await request("/admin/online-players");
              if (Array.isArray(online)) setAdminOnlinePlayers(online);
              else if (Array.isArray(online.players)) setAdminOnlinePlayers(online.players);
              else if (Array.isArray(online.players_list)) setAdminOnlinePlayers(online.players_list);
              else setAdminOnlinePlayers([]);
            }
          } catch {
            // ignore if endpoint not available
          }
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setLoadingAdmin(false);
      }
      return acc.account || null;
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        handleLogout();
        return null;
      }
      setAccountMessage(err.body?.message || err.message || t.messages.loadAccountError);
      return null;
    }
  }

  const handleLogout = () => {
    saveToken(null);
    setToken(null);
    setAccountData(null);
    setCharacters([]);
    goToView("home");
  };

  const handleProfileChange = (event) => {
    setProfileForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    setAccountMessage("");
    try {
      const res = await request("/account/me/profile", {
        method: "PUT",
        body: JSON.stringify(profileForm),
      });
      setAccountMessage(res.message || t.messages.profileUpdated);
      setProfileForm({
        display_name: res.profile?.display_name || "",
        avatar_url: res.profile?.avatar_url || "",
        bio: res.profile?.bio || "",
        instagram_url: res.profile?.instagram_url || res.profile?.instagram || profileForm.instagram_url || "",
        discord_url: res.profile?.discord_url || res.profile?.discord || profileForm.discord_url || "",
        website_url: res.profile?.website_url || res.profile?.website || profileForm.website_url || "",
        location: res.profile?.location || profileForm.location || "",
      });
    } catch (err) {
      setAccountMessage(err.body?.message || err.message || t.messages.profileUpdateError);
    }
  };

  const handlePasswordChange = (event) => {
    setPasswordForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setAccountMessage("");
    try {
      const res = await request("/account/me/change-password", {
        method: "POST",
        body: JSON.stringify(passwordForm),
      });
      setAccountMessage(res.message || t.messages.passwordUpdated);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setAccountMessage(err.body?.message || err.message || t.messages.passwordUpdateError);
    }
  };

  const rankingPreview = ranking.length > 0 ? ranking.slice(0, 3) : topPlayersFallback;
  const rankingRows = useMemo(() => {
    const source = rankingTab === "guilds"
      ? [...guildRanking]
      : rankingTab === "bosses"
        ? rankingEndpointPlaceholders.bosses
        : [...ranking];

    const sortedSource = rankingTab === "fame"
      ? [...source].sort((a, b) => (getPlayerFame(b) ?? 0) - (getPlayerFame(a) ?? 0))
      : source;
    const rankedSource = sortedSource.map((player, index) => ({ ...player, _rankingPosition: index + 1 }));

    const searchValue = rankingSearch.trim().toLowerCase();
    if (!searchValue) return rankedSource;

    return rankedSource.filter((player) => getPlayerName(player).toLowerCase().includes(searchValue));
  }, [guildRanking, ranking, rankingSearch, rankingTab]);
  const selectedPlayerProfile = useMemo(
    () => (view === "profile" ? findPlayerProfile(ranking, getProfileTargetFromHash()) : null),
    [ranking, view],
  );
  const serverOnline = status?.ok === true || status?.server === "online";
  const visibleNewsItems = showUpdateContent ? t.newsItems : t.newsItems.slice(1);
  const fallbackNews = visibleNewsItems.map(([image, title, resumen], index) => ({
    id: `fallback-${index}`,
    titulo: title,
    resumen,
    contenido: `${resumen}\n\n${language === "es" ? "Esta nota de ejemplo se reemplaza automaticamente cuando publiques noticias desde el panel de administracion." : "This sample article is replaced automatically when you publish news from the admin panel."}`,
    categoria: index === 0 ? "Eventos" : "Comunidad",
    imagen_principal: image,
    galeria: [],
    slug: `fallback-${index}`,
    vistas: 0,
    destacada: index === 0,
    fecha_publicacion: new Date().toISOString(),
  }));
  const hasPublicNewsFilters = Boolean(
    publicNewsSearch.trim() ||
    publicNewsDateFrom ||
    publicNewsDateTo ||
    (publicNewsCategory && !["Todas", "All"].includes(publicNewsCategory)),
  );
  const newsForDisplay = publicNews.length > 0 ? publicNews : (hasPublicNewsFilters ? [] : fallbackNews);
  const onlinePlayers =
    status?.onlinePlayers ??
    status?.playersOnline ??
    status?.online_players ??
    status?.onlineCount ??
    status?.players_online ??
    0;

  return (
    <div className="app-shell">
      <div className="app-backdrop">
        <img src="/portada.png" alt="LatinMS cover" className="app-backdrop__image" />
      </div>

      <header className="topbar">
        <button type="button" className="brand" onClick={() => goToView("home")}>
          <img src="/latinms.png" alt="LatinMS" className="brand__logo" />
        </button>

        <div className="topbar__right">
          <div className="topbar__meta">
            <div className="language-switcher" aria-label="Language selector">
              <button
                type="button"
                className={language === "en" ? "is-active" : ""}
                onClick={() => setLanguage("en")}
              >
                EN
              </button>
              <span>|</span>
              <button
                type="button"
                className={language === "es" ? "is-active" : ""}
                onClick={() => setLanguage("es")}
              >
                ES
              </button>
            </div>
            <div className="topbar-rates">
              <img src="/argflag" alt="" className="topbar-rates__flag" />
              {t.hero.rates}
            </div>
            <div className={`topbar-status${serverOnline ? " is-online" : ""}`}>
              <span></span>
              {serverOnline ? onlinePlayers : "-"} {language === "es" ? "Jugadores en linea" : "Players online"}
            </div>
            <button type="button" className="play-now" onClick={() => goToView(token ? "download" : "register")}>
              <Download size={17} />
              {language === "es" ? "JUGAR AHORA" : "PLAY NOW"}
            </button>
            <div className="topbar-social-icons">
              <button type="button" onClick={goToComposer} aria-label={language === "es" ? "Crear post" : "Create post"}>
                <PlusSquare size={18} />
              </button>
              <button type="button" aria-label={language === "es" ? "Notificaciones" : "Notifications"}>
                <Bell size={18} />
              </button>
              <button type="button" onClick={() => goToView(token ? "account" : "login")} aria-label={token ? t.nav.account : t.nav.login}>
                <UserCircle size={19} />
              </button>
            </div>
          </div>

          <nav className="topbar__nav" aria-label={t.nav.aria}>
            <button type="button" className={view === "home" ? "is-active" : ""} onClick={() => goToView("home")}>
              {t.nav.home}
            </button>
            <button type="button" className={view === "news" ? "is-active" : ""} onClick={() => goToView("news")}>
              {t.nav.news}
            </button>
            <button type="button" className={view === "ranking" ? "is-active" : ""} onClick={() => goToView("ranking")}>
              {t.nav.ranking}
            </button>
            <button type="button" className={view === "download" ? "is-active" : ""} onClick={() => goToView("download")}>
              {t.nav.download}
            </button>
            {token ? (
              <button
                type="button"
                onClick={handleVoteNx}
                disabled={voteStatusLoading || voteStarting || !voteStatus?.canVote}
                title={!voteStatus?.canVote ? (language === "es" ? "Esperá el cooldown de 24 horas" : "Wait for the 24-hour cooldown") : undefined}
              >
                {voteStatusLoading
                  ? (language === "es" ? "Verificando voto..." : "Checking vote...")
                  : voteStarting
                    ? (language === "es" ? "Iniciando voto..." : "Starting vote...")
                    : !voteStatus?.canVote
                      ? (language === "es" ? `Podrás votar en ${formatVoteRemaining(voteRemainingSeconds)}` : `Vote in ${formatVoteRemaining(voteRemainingSeconds)}`)
                      : t.nav.voteNx}
              </button>
            ) : null}
            <button
              type="button"
              className={["login", "register", "recover", "reset-password", "account"].includes(view) ? "is-active" : ""}
              onClick={() => goToView(token ? "account" : "login")}
            >
              {token ? t.nav.account : t.nav.login}
            </button>
          </nav>
          {token && !voteStatusLoading && voteStatus ? (
            <div className="vote-status-panel" role="status" aria-live="polite">
              <div className="vote-status-panel__clock">
                <span>{language === "es" ? "Reloj de voto" : "Vote clock"}</span>
                <strong>{voteStatus.canVote ? (language === "es" ? "Disponible ahora" : "Available now") : formatVoteRemaining(voteRemainingSeconds)}</strong>
                {!voteStatus.canVote ? (
                  <small>{language === "es" ? `Próximo voto: ${formatVoteNextAt(voteStatus.nextVoteAt, language)}` : `Next vote: ${formatVoteNextAt(voteStatus.nextVoteAt, language)}`}</small>
                ) : (
                  <small>{language === "es" ? "Podés votar ahora y recibir NX." : "You can vote now and receive NX."}</small>
                )}
              </div>
              <div className="vote-status-panel__total">
                <span>{language === "es" ? "Votos aceptados" : "Accepted votes"}</span>
                <strong>{Number(voteStatus.totalVotes) || 0}</strong>
                <small>{language === "es" ? "Tu total acumulado" : "Your accumulated total"}</small>
              </div>
              {!voteStatus.canVote ? (
                <p>{language === "es" ? "Podés votar una vez cada 24 horas. El botón se habilitará automáticamente cuando se cumpla el tiempo desde tu último voto aceptado." : "You can vote once every 24 hours. The button will enable automatically after 24 hours from your last accepted vote."}</p>
              ) : null}
            </div>
          ) : null}
          {token && voteMessage ? <div className="vote-cooldown-notice vote-cooldown-notice--message" role="status">{voteMessage}</div> : null}
        </div>
      </header>

      {showUpdateNotice ? (
        <div className="update-modal" role="dialog" aria-modal="true" aria-labelledby="update-modal-title">
          <div className="update-modal__panel">
            <button
              type="button"
              className="update-modal__close"
              aria-label={t.updateNotice.closeLabel}
              onClick={acknowledgeUpdateNotice}
            >
              x
            </button>
            <span className="panel__kicker">{t.updateNotice.kicker}</span>
            <h2 id="update-modal-title">{t.updateNotice.title}</h2>
            <p>{t.updateNotice.copy}</p>
            <ol>
              {t.updateNotice.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="update-modal__actions">
              <button type="button" className="button-primary" onClick={handleUpdateDownload}>
                <Download size={18} />
                {t.updateNotice.download}
              </button>
              <button type="button" className="button-secondary" onClick={acknowledgeUpdateNotice}>
                {t.updateNotice.accept}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="page">
        {view === "home" ? (
          <section className="home-portal-hero">
            <div className="home-portal-hero__content">
              <img src="/latinms.png" alt="LatinMS" className="home-portal-hero__brand" />
              <span className="home-portal-hero__badge">v83 LatinMS</span>
              <h1>{t.hero.title}</h1>
              <p>{t.hero.copy}</p>
              <div className="home-portal-hero__actions">
                <button type="button" className="button-primary" onClick={() => goToView("register")}>
                  {t.hero.start}
                  <ArrowRight size={18} />
                </button>
                <button type="button" className="button-secondary" onClick={() => goToView("download")}>
                  {t.pages.downloadClient}
                  <Download size={18} />
                </button>
              </div>
            </div>
            <div className="home-portal-hero__side">
              <div className={`status-pill${serverOnline ? " is-online" : ""}`}>
                <span className="status-pill__dot"></span>
                {serverOnline ? `${onlinePlayers} ${t.hero.playersOnline}` : t.hero.offline}
              </div>
              <img src="/5.png" alt="" />
            </div>
            <div className="home-portal-hero__rail"></div>
          </section>
        ) : null}

        <section className={`content-grid${view === "home" ? " content-grid--home" : ""}`}>
          <div className="content-main">
            {view === "home" ? (
              <>
                <div className="home-social-layout">
                  <aside className="home-left-rail" aria-label={language === "es" ? "Accesos LatinMS" : "LatinMS shortcuts"}>
                    <section className="home-rail-card home-rail-card--brand">
                      <img src="/latinms.png" alt="LatinMS" />
                      <strong>LatinMS v83</strong>
                    </section>
                    <a href={downloadUrl} target="_blank" rel="noreferrer" className="home-rail-link">
                      <Download size={20} />
                      <span>{t.pages.downloadClient}</span>
                    </a>
                    <a href={discordUrl} target="_blank" rel="noreferrer" className="home-rail-link">
                      <MessageCircle size={20} />
                      <span>Discord</span>
                    </a>
                    <a href={whatsappUrl} target="_blank" rel="noreferrer" className="home-rail-link">
                      <MessageCircle size={20} />
                      <span>WhatsApp</span>
                    </a>
                    <button type="button" className="home-rail-link" onClick={goToComposer}>
                      <PlusSquare size={20} />
                      <span>{language === "es" ? "Crear post" : "Create post"}</span>
                    </button>
                  </aside>

                  <div className="home-feed-center">
                    <section className="home-mobile-actions">
                      <button type="button" onClick={goToComposer}>
                        <PlusSquare size={18} />
                        {language === "es" ? "Crear post" : "Create post"}
                      </button>
                      <a href={discordUrl} target="_blank" rel="noreferrer">
                        <MessageCircle size={18} />
                        Discord
                      </a>
                      <a href={whatsappUrl} target="_blank" rel="noreferrer">
                        <MessageCircle size={18} />
                        WhatsApp
                      </a>
                    </section>

                    <SocialFeed
                      commentDrafts={commentDrafts}
                      language={language}
                      onCommentChange={(postId, value) => setCommentDrafts((current) => ({ ...current, [postId]: value }))}
                      onImageSelect={handleSocialPostImageFile}
                      onLike={toggleSocialLike}
                      onLoadMore={() => loadSocialPosts({ reset: false })}
                      onSubmitComment={submitSocialComment}
                      onSubmitPost={submitSocialPost}
                      onDateFromChange={setSocialPostDateFrom}
                      onDateToChange={setSocialPostDateTo}
                      onPostChange={handleSocialPostChange}
                      onResetDateFilter={() => {
                        setSocialPostDateFrom("");
                        setSocialPostDateTo("");
                      }}
                      postForm={socialPostForm}
                      posts={socialPosts}
                      dateFrom={socialPostDateFrom}
                      dateTo={socialPostDateTo}
                      hasMore={socialPostsHasMore}
                      loading={socialPostsLoading}
                      token={token}
                      message={socialPostMessage}
                      composerRef={socialComposerRef}
                    />
                  </div>

                  <aside className="home-right-rail" aria-label={language === "es" ? "Noticias y ranking" : "News and ranking"}>
                    <section className="home-feed-news">
                      <div className="home-feed-title">
                        <span>{language === "es" ? "Noticias oficiales" : "Official news"}</span>
                        <button type="button" onClick={() => goToView("news")}>{language === "es" ? "Ver todas" : "View all"}</button>
                      </div>
                      {newsForDisplay.slice(0, 2).map((news) => (
                        <article key={news.slug || news.id} className="home-feed-news-card">
                          <div className="home-feed-news-card__head">
                            <img src="/latinms.png" alt="" />
                            <div>
                              <strong>LatinMS</strong>
                              <span>{news.categoria || (language === "es" ? "Noticia oficial" : "Official news")}</span>
                            </div>
                          </div>
                          <h3>{news.titulo}</h3>
                          <p>{news.resumen}</p>
                          <img src={news.imagen_principal} alt="" className="home-feed-news-card__image" />
                          <button type="button" onClick={() => news.slug?.startsWith("fallback") ? goToView("news") : (window.location.hash = `news?slug=${encodeURIComponent(news.slug)}`)}>{language === "es" ? "Leer mas" : "Read more"}</button>
                        </article>
                      ))}
                    </section>

                    <section className="home-feed-ranking">
                      <div className="home-feed-title">
                        <span>{t.home.topKicker}</span>
                        <button type="button" onClick={() => goToView("ranking")}>{language === "es" ? "Ranking completo" : "Full ranking"}</button>
                      </div>
                      <RankingPreview players={rankingPreview} language={language} text={t.ranking} />
                    </section>
                  </aside>
                </div>
              </>
            ) : null}

            {view === "news" ? (
              <section className="panel">
                <div className="panel__head">
                  <div>
                    <span className="panel__kicker">{t.nav.news}</span>
                    <h2>{t.pages.newsTitle}</h2>
                  </div>
                  <Newspaper size={24} />
                </div>
                {selectedNews ? (
                  <NewsDetail
                    language={language}
                    news={selectedNews}
                    relatedNews={relatedNews}
                    onBack={() => {
                      window.location.hash = "news";
                    }}
                    onOpenNews={(slug) => {
                      window.location.hash = `news?slug=${encodeURIComponent(slug)}`;
                    }}
                  />
                ) : (
                  <NewsList
                    categories={newsCategories}
                    hasMore={publicNewsHasMore}
                    items={newsForDisplay}
                    language={language}
                    loading={publicNewsLoading}
                    onCategoryChange={setPublicNewsCategory}
                    onDateFromChange={setPublicNewsDateFrom}
                    onDateToChange={setPublicNewsDateTo}
                    onLoadMore={() => loadPublicNews({ reset: false })}
                    onOpenNews={(slug) => {
                      if (String(slug).startsWith("fallback")) return;
                      window.location.hash = `news?slug=${encodeURIComponent(slug)}`;
                    }}
                    onResetDateFilter={() => {
                      setPublicNewsDateFrom("");
                      setPublicNewsDateTo("");
                    }}
                    onSearchChange={setPublicNewsSearch}
                    search={publicNewsSearch}
                    selectedCategory={publicNewsCategory}
                    dateFrom={publicNewsDateFrom}
                    dateTo={publicNewsDateTo}
                    showLoadMore={publicNews.length > 0}
                  />
                )}
              </section>
            ) : null}

            {view === "ranking" ? (
              <RankingPage
                players={rankingRows}
                activeTab={rankingTab}
                onTabChange={(nextTab) => {
                  setRankingTab(nextTab);
                  setRankingSearch("");
                  setRankingPage(1);
                }}
                search={rankingSearch}
                onSearchChange={(value) => {
                  setRankingSearch(value);
                  setRankingPage(1);
                }}
                currentPage={rankingPage}
                onPageChange={setRankingPage}
                loading={rankingLoading}
                language={language}
                text={t.ranking}
              />
            ) : null}

            {view === "profile" ? (
              <PublicPlayerProfile
                player={selectedPlayerProfile}
                loading={rankingLoading}
                language={language}
                rankingText={t.ranking}
                accountText={t.account}
                onBack={() => goToView("ranking")}
              />
            ) : null}

            {view === "download" ? (
              <section className="panel download-page">
                <div className="panel__head">
                  <div>
                    <span className="panel__kicker">{t.pages.downloadKicker}</span>
                    <h2>{t.pages.downloadTitle}</h2>
                  </div>
                  <Download size={24} />
                </div>
                <div className="download-layout">
                  <img src="/6.png" alt="" className="download-illustration" />
                  <div>
                    <p className="panel__intro">{t.pages.downloadCopy}</p>
                    <a className="button-primary" href={downloadUrl} target="_blank" rel="noreferrer">
                      {t.pages.downloadClient}
                      <ArrowRight size={18} />
                    </a>
                    {showUpdateContent ? (
                      <div className="download-patch">
                        <h3>{t.pages.patchTitle}</h3>
                        <p>{t.pages.patchCopy}</p>
                        <a className="button-secondary" href={updateDownloadUrl} target="_blank" rel="noreferrer">
                          {t.pages.patchDownload}
                          <Download size={18} />
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            {view === "login" ? (
              <section className="panel panel--form">
                <div className="panel__head">
                  <div>
                    <span className="panel__kicker">{t.auth.loginKicker}</span>
                    <h2>{t.auth.loginTitle}</h2>
                  </div>
                  <LockKeyhole size={22} />
                </div>
                <p className="panel__intro">{t.auth.loginIntro}</p>
                <form className="form-card" onSubmit={handleLogin}>
                  <label>
                    {t.auth.username}
                    <input type="text" name="username" value={loginForm.username} onChange={handleLoginChange} placeholder={t.auth.usernamePlaceholder} />
                  </label>
                  <label>
                    {t.auth.password}
                    <input type="password" name="password" value={loginForm.password} onChange={handleLoginChange} placeholder={t.auth.passwordPlaceholder} />
                  </label>
                  <button type="button" className="text-button" onClick={() => goToView("recover")}>
                    {t.auth.forgotPassword}
                  </button>
                  <div className="auth-actions">
                    <button type="submit" className="button-primary">{t.auth.loginButton}</button>
                    <button type="button" className="button-secondary" onClick={() => goToView("register")}>{t.auth.createAccount}</button>
                  </div>
                </form>
                {loginMessage ? <p className="feedback">{loginMessage}</p> : null}
              </section>
            ) : null}

            {view === "recover" ? (
              <section className="panel panel--form">
                <div className="panel__head">
                  <div>
                    <span className="panel__kicker">{t.auth.recoverKicker}</span>
                    <h2>{t.auth.recoverTitle}</h2>
                  </div>
                  <Mail size={22} />
                </div>
                <p className="panel__intro">{t.auth.recoverIntro}</p>
                <form className="form-card" onSubmit={handleRecover}>
                  <label>
                    {t.auth.email}
                    <input type="email" name="email" value={recoverForm.email} onChange={handleRecoverChange} placeholder={t.auth.emailPlaceholder} />
                  </label>
                  <div className="auth-actions">
                    <button type="submit" className="button-primary">{t.auth.recoverButton}</button>
                    <button type="button" className="button-secondary" onClick={() => goToView("login")}>{t.auth.backToLogin}</button>
                  </div>
                </form>
                {recoverMessage ? <p className="feedback">{recoverMessage}</p> : null}
              </section>
            ) : null}

            {view === "reset-password" ? (
              <section className="panel panel--form">
                <div className="panel__head">
                  <div>
                    <span className="panel__kicker">{t.auth.resetKicker}</span>
                    <h2>{t.auth.resetTitle}</h2>
                  </div>
                  <KeyRound size={22} />
                </div>
                <p className="panel__intro">{t.auth.resetIntro}</p>
                <form className="form-card" onSubmit={handleResetPassword}>
                  <label>
                    {t.auth.newPassword}
                    <input type="password" name="newPassword" value={resetPasswordForm.newPassword} onChange={handleResetPasswordChange} placeholder={t.auth.passwordMinPlaceholder} />
                  </label>
                  <label>
                    {t.auth.repeatNewPassword}
                    <input type="password" name="confirmPassword" value={resetPasswordForm.confirmPassword} onChange={handleResetPasswordChange} placeholder={t.auth.repeatNewPassword} />
                  </label>
                  <div className="auth-actions">
                    <button type="submit" className="button-primary">{t.auth.resetButton}</button>
                    <button type="button" className="button-secondary" onClick={() => goToView("login")}>{t.auth.backToLogin}</button>
                  </div>
                </form>
                {resetPasswordMessage ? <p className="feedback">{resetPasswordMessage}</p> : null}
              </section>
            ) : null}

            {view === "account" ? (
              <AccountPanel
                accountData={accountData}
                accountMessage={accountMessage}
                accountTab={accountTab}
                adminNews={adminNews}
                adminNewsForm={adminNewsForm}
                adminNewsLoading={adminNewsLoading}
                adminNewsMessage={adminNewsMessage}
                adminStats={adminStats}
                characters={characters}
                deleteAdminNews={deleteAdminNews}
                editAdminNews={editAdminNews}
                handleLogout={handleLogout}
                handleAdminGalleryImage={handleAdminGalleryImage}
                handleAdminNewsChange={handleAdminNewsChange}
                handleAdminNewsImage={handleAdminNewsImage}
                handlePasswordChange={handlePasswordChange}
                handleProfileChange={handleProfileChange}
                isAdmin={isAdmin}
                language={language}
                loadingAdmin={loadingAdmin}
                passwordForm={passwordForm}
                profileForm={profileForm}
                ranking={ranking}
                setAccountTab={setAccountTab}
                resetAdminNewsForm={resetAdminNewsForm}
                submitAdminNews={submitAdminNews}
                submitPassword={submitPassword}
                submitProfile={submitProfile}
                adminOnlinePlayers={adminOnlinePlayers}
                text={t.account}
                token={token}
              />
            ) : null}

            {view === "register" ? (
              <section className="panel panel--form">
                <div className="panel__head">
                  <div>
                    <span className="panel__kicker">{t.auth.registerKicker}</span>
                    <h2>{t.auth.registerTitle}</h2>
                  </div>
                  <UserPlus size={22} />
                </div>
                <p className="panel__intro">{t.auth.registerIntro}</p>
                <form className="form-card" onSubmit={handleRegister}>
                  <label>
                    {t.auth.username}
                    <input type="text" name="username" value={form.username} onChange={handleRegisterChange} placeholder="4 - 13 characters" />
                  </label>
                  <label>
                    {t.auth.displayName}
                    <input type="text" name="displayName" value={form.displayName} onChange={handleRegisterChange} placeholder={t.auth.displayNamePlaceholder} />
                  </label>
                  <label>
                    {t.auth.email}
                    <input type="email" name="email" value={form.email} onChange={handleRegisterChange} placeholder={t.auth.emailPlaceholder} />
                  </label>
                  <label>
                    {t.auth.password}
                    <input type="password" name="password" value={form.password} onChange={handleRegisterChange} placeholder={t.auth.passwordMinPlaceholder} />
                  </label>
                  <label>
                    {t.auth.repeatPassword}
                    <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleRegisterChange} placeholder={t.auth.repeatPasswordPlaceholder} />
                  </label>
                  <label>
                    {t.auth.country}
                    <select name="country" value={form.country} onChange={handleRegisterChange}>
                      <option value="">{t.auth.countryPlaceholder}</option>
                      {countryOptions.map((country) => (
                        <option key={country.code} value={country.name}>{country.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.auth.birthDate}
                    <input type="date" name="birthDate" value={form.birthDate} onChange={handleRegisterChange} />
                  </label>
                  <button type="submit" className="button-primary button-primary--full" disabled={loadingRegister}>
                    {loadingRegister ? t.auth.creatingAccount : t.auth.createAccount}
                  </button>
                </form>
                {registerMessage ? <p className="feedback">{registerMessage}</p> : null}
                <div className="helper-note">
                  <span>{t.auth.initialPin}</span>
                  <span>{t.auth.initialPic}</span>
                </div>
              </section>
            ) : null}
          </div>

          <aside className={`sidebar${view === "home" ? " sidebar--home-minimal" : ""}`}>
            {view !== "home" ? (
              <section className="panel panel--compact">
                <span className="panel__kicker">{t.sidebar.shortcuts}</span>
                <h2>{t.sidebar.allSet}</h2>
                <div className="sidebar-actions">
                  <button type="button" className="button-secondary" onClick={() => goToView("home")}>{t.sidebar.seeHome}</button>
                  <button type="button" className="button-secondary" onClick={() => goToView("news")}>{t.sidebar.seeNews}</button>
                  <button type="button" className="button-secondary" onClick={() => goToView("ranking")}>{t.sidebar.seeRanking}</button>
                  <button type="button" className="button-secondary" onClick={() => goToView("download")}>{t.nav.download}</button>
                  <button type="button" className="button-secondary" onClick={() => goToView(token ? "account" : "login")}>
                    {token ? t.nav.account : t.nav.login}
                  </button>
                </div>
              </section>
            ) : null}

            {view === "home" && token ? (
              <button type="button" onClick={handleVoteNx} className="panel panel--compact panel--voting">
                <img src="/votanos.png" alt={t.sidebar.voteAlt} />
              </button>
            ) : null}

            <section className="panel panel--compact panel--community">
              <img src="/whatsapp-community.png" alt={t.community.imageAlt} />
              <a className="button-primary button-primary--full" href={whatsappUrl} target="_blank" rel="noreferrer">
                {t.community.action}
                <ArrowRight size={18} />
              </a>
              <a className="button-secondary button-primary--full community-discord" href={discordUrl} target="_blank" rel="noreferrer">
                {t.community.discordAction}
                <MessageCircle size={18} />
              </a>
            </section>

            <section className="panel panel--compact panel--download">
              <span className="panel__kicker">{t.sidebar.client}</span>
              <h2>{t.sidebar.title}</h2>
              <img src="/6.png" alt="" className="sidebar-illustration" />
              <p>{t.sidebar.copy}</p>
              <a className="button-primary button-primary--full" href={downloadUrl} target="_blank" rel="noreferrer">
                {t.pages.downloadClient}
                <ArrowRight size={18} />
              </a>
            </section>
          </aside>
        </section>
      </main>

      <nav className="mobile-bottom-nav" aria-label={t.nav.aria}>
        <button type="button" className={view === "home" ? "is-active" : ""} onClick={() => goToView("home")}>
          <House size={21} />
          <span>{t.nav.home}</span>
        </button>
        <button type="button" className={view === "news" ? "is-active" : ""} onClick={() => goToView("news")}>
          <Newspaper size={21} />
          <span>{t.nav.news}</span>
        </button>
        <button type="button" className={view === "ranking" || view === "profile" ? "is-active" : ""} onClick={() => goToView("ranking")}>
          <Trophy size={21} />
          <span>{t.nav.ranking}</span>
        </button>
        <button type="button" onClick={goToComposer}>
          <PlusSquare size={21} />
          <span>{language === "es" ? "Crear" : "Create"}</span>
        </button>
        <button type="button" className={view === "download" ? "is-active" : ""} onClick={() => goToView("download")}>
          <Download size={21} />
          <span>{t.nav.download}</span>
        </button>
        <button
          type="button"
          className={["login", "register", "recover", "reset-password", "account"].includes(view) ? "is-active" : ""}
          onClick={() => goToView(token ? "account" : "login")}
        >
          <UserCircle size={21} />
          <span>{token ? t.nav.account : t.nav.login}</span>
        </button>
      </nav>
    </div>
  );
}

function NewsList({
  categories,
  dateFrom,
  dateTo,
  hasMore,
  items,
  language,
  loading,
  onCategoryChange,
  onDateFromChange,
  onDateToChange,
  onLoadMore,
  onOpenNews,
  onResetDateFilter,
  onSearchChange,
  search,
  selectedCategory,
  showLoadMore,
}) {
  const isSpanish = language === "es";
  const allLabel = isSpanish ? "Todas" : "All";
  const categoryOptions = [allLabel, ...categories.filter(Boolean)];

  return (
    <div className="news-feed-page">
      <div className="news-toolbar">
        <label className="news-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={isSpanish ? "Buscar noticias" : "Search news"}
          />
        </label>
        <div className="news-category-filter">
          {categoryOptions.map((category) => (
            <button
              key={category}
              type="button"
              className={(selectedCategory || allLabel) === category ? "is-active" : ""}
              onClick={() => onCategoryChange(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="date-range-filter">
          <label>
            {isSpanish ? "Desde" : "From"}
            <input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
          </label>
          <label>
            {isSpanish ? "Hasta" : "To"}
            <input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
          </label>
          {(dateFrom || dateTo) ? (
            <button type="button" onClick={onResetDateFilter}>
              {isSpanish ? "Limpiar fechas" : "Clear dates"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="news-grid">
        {items.map((news, index) => (
          <NewsFeedCard
            key={news.slug || news.id}
            featured={index === 0 && news.destacada}
            isSpanish={isSpanish}
            news={news}
            onOpenNews={onOpenNews}
            language={language}
          />
        ))}
      </div>

      {items.length === 0 && !loading ? (
        <p className="feedback">{isSpanish ? "No hay noticias publicadas con esos filtros." : "No published news match those filters."}</p>
      ) : null}

      {showLoadMore && hasMore ? (
        <button type="button" className="button-secondary news-load-more" onClick={onLoadMore} disabled={loading}>
          {loading ? (isSpanish ? "Cargando..." : "Loading...") : (isSpanish ? "Cargar mas" : "Load more")}
        </button>
      ) : null}
    </div>
  );
}

function NewsFeedCard({ featured, isSpanish, language, news, onOpenNews }) {
  return (
    <article className={`news-feed-card${featured ? " news-feed-card--featured" : ""}`}>
      <div className="news-feed-card__media">
        <img src={news.imagen_principal} alt={news.titulo} />
      </div>
      <div className="news-feed-card__body">
        <div className="news-feed-card__meta">
          <span>{news.categoria}</span>
          <span><CalendarDays size={14} />{formatNewsDate(news.fecha_publicacion, language)}</span>
        </div>
        <h3>{news.titulo}</h3>
        <p>{news.resumen}</p>
        <div className="news-feed-card__actions">
          <span><Eye size={15} />{news.vistas || 0}</span>
          <button type="button" onClick={() => onOpenNews(news.slug)}>
            {isSpanish ? "Leer mas" : "Read more"}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

function NewsShareActions({ news, language }) {
  const isSpanish = language === "es";
  return (
    <div className="news-share-actions" aria-label={isSpanish ? "Compartir noticia" : "Share news"}>
      <button type="button" onClick={() => openShare("whatsapp", news)}>
        <MessageCircle size={16} />WhatsApp
      </button>
      <button type="button" onClick={() => openShare("facebook", news)}>
        <Share2 size={16} />Facebook
      </button>
      <button type="button" onClick={() => openShare("x", news)}>
        <Send size={16} />X
      </button>
    </div>
  );
}

function NewsDetail({ language, news, onBack, onOpenNews, relatedNews }) {
  const isSpanish = language === "es";
  const safeContentHtml = useMemo(() => sanitizeNewsHtml(news.contenido), [news.contenido]);

  return (
    <article className="news-detail">
      <button type="button" className="button-secondary news-detail__back" onClick={onBack}>
        <ChevronLeft size={17} />
        {isSpanish ? "Volver al feed" : "Back to feed"}
      </button>
      <img src={news.imagen_principal} alt={news.titulo} className="news-detail__hero" />
      <div className="news-detail__meta">
        <span>{news.categoria}</span>
        <span><CalendarDays size={15} />{formatNewsDate(news.fecha_publicacion, language)}</span>
        <span><Eye size={15} />{news.vistas || 0}</span>
      </div>
      <h1>{news.titulo}</h1>
      <p className="news-detail__summary">{news.resumen}</p>
      <NewsShareActions news={news} language={language} />
      <div className="news-detail__content" dangerouslySetInnerHTML={{ __html: safeContentHtml }} />
      {news.galeria?.length ? (
        <div className="news-detail__gallery">
          {news.galeria.map((image, index) => (
            <img key={`${image.slice(0, 24)}-${index}`} src={image} alt={`${news.titulo} ${index + 1}`} />
          ))}
        </div>
      ) : null}
      {relatedNews.length ? (
        <section className="related-news">
          <h2>{isSpanish ? "Noticias relacionadas" : "Related news"}</h2>
          <div className="related-news__grid">
            {relatedNews.map((item) => (
              <button key={item.slug} type="button" onClick={() => onOpenNews(item.slug)}>
                <img src={item.imagen_principal} alt="" />
                <span>{item.categoria}</span>
                <strong>{item.titulo}</strong>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

function AdminNewsManager({
  form,
  language,
  loading,
  message,
  news,
  onChange,
  onDelete,
  onEdit,
  onGalleryImage,
  onImage,
  onReset,
  onSubmit,
}) {
  const isSpanish = language === "es";

  return (
    <div className="admin-news-manager">
      <div className="admin-news-manager__head">
        <div>
          <h3>{isSpanish ? "Gestion de Noticias" : "News Management"}</h3>
          <p>{isSpanish ? "Crea, programa, publica, fija y administra el feed publico." : "Create, schedule, publish, pin, and manage the public feed."}</p>
        </div>
        <button type="button" className="button-secondary" onClick={onReset}>
          <PlusSquare size={17} />
          {isSpanish ? "Nueva" : "New"}
        </button>
      </div>

      <form className="admin-news-form" onSubmit={onSubmit}>
        <div className="admin-news-form__grid">
          <label>
            {isSpanish ? "Titulo" : "Title"}
            <input name="titulo" value={form.titulo} onChange={onChange} maxLength={180} required />
          </label>
          <label>
            {isSpanish ? "Categoria" : "Category"}
            <input name="categoria" value={form.categoria} onChange={onChange} maxLength={80} required />
          </label>
          <label>
            {isSpanish ? "Fecha de publicacion" : "Publish date"}
            <input type="datetime-local" name="fecha_publicacion" value={form.fecha_publicacion} onChange={onChange} required />
          </label>
          <label>
            {isSpanish ? "Estado" : "Status"}
            <select name="estado" value={form.estado} onChange={onChange}>
              <option value="Publicado">{isSpanish ? "Publicado" : "Published"}</option>
              <option value="Borrador">{isSpanish ? "Borrador" : "Draft"}</option>
            </select>
          </label>
        </div>
        <label>
          {isSpanish ? "Resumen corto" : "Short summary"}
          <textarea name="resumen" value={form.resumen} onChange={onChange} maxLength={320} rows={3} required />
        </label>
        <label>
          {isSpanish ? "Contenido completo" : "Full content"}
          <textarea name="contenido" value={form.contenido} onChange={onChange} rows={8} required />
        </label>

        <div className="admin-news-image-tools">
          <label className="admin-news-upload">
            <Upload size={18} />
            {isSpanish ? "Imagen principal 1:1 WebP" : "Main 1:1 WebP image"}
            <input type="file" accept="image/*" onChange={(event) => onImage(event, "imagen_principal")} />
          </label>
          <label className="admin-news-upload">
            <ImageIcon size={18} />
            {isSpanish ? "Agregar galeria" : "Add gallery"}
            <input type="file" accept="image/*" multiple onChange={onGalleryImage} />
          </label>
          <label className="admin-news-check">
            <input type="checkbox" name="destacada" checked={form.destacada} onChange={onChange} />
            {isSpanish ? "Fijar como destacada" : "Pin as featured"}
          </label>
        </div>

        {form.imagen_principal ? (
          <div className="admin-news-preview">
            <img src={form.imagen_principal} alt={isSpanish ? "Vista previa" : "Preview"} />
            <span>{isSpanish ? "Recortada a 1080x1080, WebP, maximo 500 KB" : "Cropped to 1080x1080, WebP, max 500 KB"}</span>
          </div>
        ) : null}

        {form.galeria.length ? (
          <div className="admin-news-gallery-preview">
            {form.galeria.map((image, index) => (
              <img key={`${image.slice(0, 24)}-${index}`} src={image} alt={`Galeria ${index + 1}`} />
            ))}
          </div>
        ) : null}

        <div className="admin-news-actions">
          <button type="submit" className="button-primary">
            <Edit3 size={17} />
            {form.id ? (isSpanish ? "Actualizar noticia" : "Update news") : (isSpanish ? "Crear noticia" : "Create news")}
          </button>
          <button type="button" className="button-secondary" onClick={onReset}>
            {isSpanish ? "Limpiar" : "Clear"}
          </button>
        </div>
      </form>

      {message ? <p className="feedback">{message}</p> : null}

      <div className="admin-news-list">
        {loading ? <p>{isSpanish ? "Cargando noticias..." : "Loading news..."}</p> : null}
        {news.map((item) => (
          <article key={item.id} className="admin-news-row">
            <img src={item.imagen_principal} alt="" />
            <div>
              <span>{item.estado} · {item.categoria} · {formatNewsDate(item.fecha_publicacion, language)}</span>
              <strong>{item.titulo}</strong>
              <small>{item.destacada ? (isSpanish ? "Destacada" : "Featured") : ""} {item.vistas || 0} vistas</small>
            </div>
            <button type="button" onClick={() => onEdit(item)} aria-label={isSpanish ? "Editar noticia" : "Edit news"}>
              <Edit3 size={17} />
            </button>
            <button type="button" onClick={() => onDelete(item.id)} aria-label={isSpanish ? "Eliminar noticia" : "Delete news"}>
              <Trash2 size={17} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function getPostAvatarSrc(post) {
  if (post?.avatar_url) return post.avatar_url;
  const characterImage = getCharacterImage(post);
  return characterImage === DEFAULT_CHARACTER_IMAGE ? "" : characterImage;
}

function SocialFeed({
  composerRef,
  commentDrafts,
  dateFrom,
  dateTo,
  hasMore,
  language,
  loading,
  onCommentChange,
  onDateFromChange,
  onDateToChange,
  onImageSelect,
  onLike,
  onLoadMore,
  onResetDateFilter,
  onSubmitComment,
  onSubmitPost,
  onPostChange,
  postForm,
  posts,
  token,
  message,
}) {
  const isSpanish = language === "es";
  const fallbackPosts = isSpanish
    ? [
        { id: "fallback-1", display_name: "Staff", account_name: "Staff", caption: "Comparte capturas, logros, drops raros y momentos con tu party.", likes: 128, comments_count: 12, comments: [] },
        { id: "fallback-2", display_name: "Ranking", account_name: "Ranking", caption: "Sube una imagen de tu progreso y deja que la comunidad te siga.", likes: 96, comments_count: 8, comments: [] },
      ]
    : [
        { id: "fallback-1", display_name: "Staff", account_name: "Staff", caption: "Share screenshots, achievements, rare drops, and party moments.", likes: 128, comments_count: 12, comments: [] },
        { id: "fallback-2", display_name: "Ranking", account_name: "Ranking", caption: "Post your progress and let the community follow your climb.", likes: 96, comments_count: 8, comments: [] },
      ];
  const hasDateFilter = Boolean(dateFrom || dateTo);
  const visiblePosts = posts.length > 0 ? posts : (hasDateFilter ? [] : fallbackPosts);

  return (
    <section className="panel home-social-feed">
      <div className="panel__head">
        <div>
          <span className="panel__kicker">{isSpanish ? "Muro social" : "Social wall"}</span>
          <h2>{isSpanish ? "Publicaciones de la comunidad" : "Community posts"}</h2>
        </div>
        <MessageCircle size={24} />
      </div>

      <form className="social-composer social-composer--app" onSubmit={onSubmitPost} ref={composerRef}>
        <div className="social-composer__prompt">
          <div className="social-composer__avatar">{token ? "L" : "?"}</div>
          <textarea
            name="caption"
            value={postForm.caption}
            onChange={onPostChange}
            placeholder={token ? (isSpanish ? "Que estas pensando en LatinMS?" : "What are you thinking in LatinMS?") : (isSpanish ? "Inicia sesion para publicar." : "Sign in to post.")}
            rows={2}
            disabled={!token}
          ></textarea>
        </div>
        {postForm.image_url ? (
          <div className="social-composer__preview">
            <img src={postForm.image_url} alt={isSpanish ? "Imagen del post" : "Post preview"} />
            <span>{postForm.image_name || (isSpanish ? "Imagen cargada" : "Loaded image")}</span>
          </div>
        ) : null}
        <div className="social-composer__footer">
          <label className="social-composer__upload">
            <ImageIcon size={18} />
            {isSpanish ? "Foto/captura" : "Photo/screenshot"}
            <input type="file" accept="image/*" onChange={onImageSelect} disabled={!token} />
          </label>
          <input
            name="image_url"
            value={postForm.image_url.startsWith("data:") ? "" : postForm.image_url}
            onChange={onPostChange}
            placeholder={isSpanish ? "O pega una URL de imagen" : "Or paste an image URL"}
            disabled={!token}
          />
          <button type="submit" className="button-primary" disabled={!token}>
            <PlusSquare size={17} />
            {isSpanish ? "Publicar" : "Post"}
          </button>
        </div>
        {message ? <p className="feedback">{message}</p> : null}
      </form>

      <div className="social-feed-filters">
        <label>
          {isSpanish ? "Desde" : "From"}
          <input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
        </label>
        <label>
          {isSpanish ? "Hasta" : "To"}
          <input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
        </label>
        {hasDateFilter ? (
          <button type="button" onClick={onResetDateFilter}>
            {isSpanish ? "Limpiar fechas" : "Clear dates"}
          </button>
        ) : null}
      </div>

      <div className="social-post-feed">
        {visiblePosts.map((post) => {
          const postAvatarSrc = getPostAvatarSrc(post);
          return (
          <article key={post.id} className="social-post-card social-post-card--live">
            <div className={`social-post-card__avatar${postAvatarSrc ? " social-post-card__avatar--image" : ""}`}>
              {postAvatarSrc ? (
                <img
                  src={postAvatarSrc}
                  alt={post.display_name || post.account_name || "LatinMS"}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = DEFAULT_CHARACTER_IMAGE;
                  }}
                />
              ) : (
                (post.display_name || post.account_name || "L").slice(0, 1)
              )}
            </div>
            <div className="social-post-card__content">
              <strong>{post.display_name || post.account_name || "LatinMS"}</strong>
              {post.main_character_name ? <span className="social-post-card__character">{post.main_character_name}</span> : null}
              <p>{post.caption}</p>
              {post.image_url ? (
                <img
                  src={post.image_url}
                  alt={isSpanish ? "Captura del juego" : "Game screenshot"}
                  className="social-post-card__image"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              <div className="social-post-card__actions">
                <button type="button" className={post.liked_by_me ? "is-active" : ""} onClick={() => onLike(post.id)}>
                  <Heart size={15} />{post.likes || 0}
                </button>
                <span><MessageCircle size={15} />{post.comments_count || 0}</span>
              </div>
              {post.comments?.length ? (
                <div className="social-comments">
                  {post.comments.map((comment) => (
                    <p key={comment.id}><strong>{comment.display_name || comment.account_name}:</strong> {comment.comment}</p>
                  ))}
                </div>
              ) : null}
              <div className="social-comment-box">
                <input
                  value={commentDrafts[post.id] || ""}
                  onChange={(event) => onCommentChange(post.id, event.target.value)}
                  placeholder={isSpanish ? "Escribe un comentario..." : "Write a comment..."}
                  disabled={!token}
                />
                <button type="button" onClick={() => onSubmitComment(post.id)} disabled={!token}>
                  {isSpanish ? "Enviar" : "Send"}
                </button>
              </div>
            </div>
          </article>
          );
        })}
      </div>

      {posts.length === 0 && hasDateFilter && !loading ? (
        <p className="feedback">{isSpanish ? "No hay publicaciones en ese rango de fechas." : "No posts in that date range."}</p>
      ) : null}

      {posts.length > 0 && hasMore ? (
        <button type="button" className="button-secondary social-load-more" onClick={onLoadMore} disabled={loading}>
          {loading ? (isSpanish ? "Cargando..." : "Loading...") : (isSpanish ? "Ver publicaciones anteriores" : "View older posts")}
        </button>
      ) : null}
    </section>
  );
}

function getPrimaryCharacter(characters) {
  return [...characters].sort((a, b) => Number(b.level || 0) - Number(a.level || 0))[0] || null;
}

function getBestRankingMatch(characters, ranking) {
  const characterNames = new Set(characters.map((character) => String(character.name || "").toLowerCase()).filter(Boolean));
  if (characterNames.size === 0) return null;

  return ranking
    .map((player, index) => ({ ...player, _rankingPosition: index + 1 }))
    .find((player) => characterNames.has(String(getPlayerName(player)).toLowerCase())) || null;
}

function normalizeSocialUrl(value, provider) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (provider === "instagram") return `https://instagram.com/${trimmed.replace(/^@/, "")}`;
  if (provider === "discord") return trimmed;
  return `https://${trimmed}`;
}

function SocialAccountProfile({ accountData, characters, isAdmin, profileForm, ranking, setAccountTab, text }) {
  const primaryCharacter = getPrimaryCharacter(characters);
  const rankingMatch = getBestRankingMatch(characters, ranking);
  const displayName = profileForm.display_name || accountData?.name || "LatinMS";
  const avatarSrc = profileForm.avatar_url || (primaryCharacter ? getCharacterImage(primaryCharacter) : "/latinms.png");
  const bestLevel = primaryCharacter?.level ?? "-";
  const bestRank = rankingMatch?._rankingPosition ?? null;
  const socialLinks = [
    { icon: AtSign, label: text.instagram, value: profileForm.instagram_url, href: normalizeSocialUrl(profileForm.instagram_url, "instagram") },
    { icon: MessageCircle, label: text.discord, value: profileForm.discord_url, href: normalizeSocialUrl(profileForm.discord_url, "discord") },
    { icon: LinkIcon, label: text.website, value: profileForm.website_url, href: normalizeSocialUrl(profileForm.website_url, "website") },
  ].filter((link) => link.value);

  return (
    <section className="account-social-profile">
      <div className="account-social-profile__cover"></div>
      <div className="account-social-profile__body">
        <div className="account-social-profile__avatar">
          <img
            src={avatarSrc}
            alt={displayName}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/latinms.png";
            }}
          />
        </div>

        <div className="account-social-profile__main">
          <div className="account-social-profile__headline">
            <div>
              <span>{text.yourProfile}</span>
              <h3>{displayName}</h3>
            </div>
            <button type="button" className="button-secondary" onClick={() => setAccountTab("profile")}>
              {text.editProfile}
            </button>
          </div>

          <div className="account-profile-badges">
            <span><BadgeCheck size={15} />{text.youBadge}</span>
            {bestRank === 1 ? <span><Crown size={15} />{text.topOneBadge}</span> : null}
            {bestRank && bestRank > 1 && bestRank <= 10 ? <span><Trophy size={15} />#{bestRank} {text.topRankBadge}</span> : null}
            {isAdmin ? <span><ShieldCheck size={15} />Staff</span> : null}
          </div>

          <div className="account-social-stats">
            <strong>{characters.length}<span>{text.characters}</span></strong>
            <strong>{bestLevel}<span>{text.level || "Level"}</span></strong>
            <strong>{bestRank ? `#${bestRank}` : "-"}<span>Ranking</span></strong>
          </div>

          <p className="account-social-profile__bio">{profileForm.bio || text.noBio}</p>

          <div className="account-social-links">
            {profileForm.location ? <span><MapPin size={15} />{profileForm.location}</span> : null}
            {primaryCharacter ? <span><Gamepad2 size={15} />{text.mainCharacter}: {primaryCharacter.name}</span> : null}
            {socialLinks.map(({ icon: Icon, label, href, value }) => href.startsWith("http") ? (
              <a key={label} href={href} target="_blank" rel="noreferrer"><Icon size={15} />{label}</a>
            ) : (
              <span key={label}><Icon size={15} />{value}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AccountPanel({
  accountData,
  accountMessage,
  accountTab,
  adminNews,
  adminNewsForm,
  adminNewsLoading,
  adminNewsMessage,
  adminStats,
  characters,
  deleteAdminNews,
  editAdminNews,
  handleLogout,
  handleAdminGalleryImage,
  handleAdminNewsChange,
  handleAdminNewsImage,
  handlePasswordChange,
  handleProfileChange,
  isAdmin,
  adminOnlinePlayers,
  language,
  loadingAdmin,
  passwordForm,
  profileForm,
  ranking,
  resetAdminNewsForm,
  setAccountTab,
  submitAdminNews,
  submitPassword,
  submitProfile,
  text,
  token,
}) {
  return (
    <section className="panel">
      <div className="panel__head">
        <div>
          <span className="panel__kicker">{text.kicker}</span>
          <h2>{text.title}</h2>
        </div>
      </div>

      {!token ? (
        <p>{text.needsLogin}</p>
      ) : (
        <>
          <SocialAccountProfile
            accountData={accountData}
            characters={characters}
            isAdmin={isAdmin}
            profileForm={profileForm}
            ranking={ranking}
            setAccountTab={setAccountTab}
            text={text}
          />

          <div className="account-menu" role="tablist" aria-label={text.tabsLabel}>
            <button type="button" className={accountTab === "account" ? "is-active" : ""} onClick={() => setAccountTab("account")}>
              <IdCard size={18} />
              {text.account}
            </button>
            <button type="button" className={accountTab === "profile" ? "is-active" : ""} onClick={() => setAccountTab("profile")}>
              <Users size={18} />
              {text.profile}
            </button>
            <button type="button" className={accountTab === "security" ? "is-active" : ""} onClick={() => setAccountTab("security")}>
              <KeyRound size={18} />
              {text.security}
            </button>
            <button type="button" className={accountTab === "characters" ? "is-active" : ""} onClick={() => setAccountTab("characters")}>
              <Gamepad2 size={18} />
              {text.characters}
            </button>
            {isAdmin ? (
              <>
                <button type="button" className={accountTab === "admin" ? "is-active" : ""} onClick={() => setAccountTab("admin")}>
                  <ShieldCheck size={18} />
                  Admin
                </button>
                <button type="button" className={accountTab === "news" ? "is-active" : ""} onClick={() => setAccountTab("news")}>
                  <Newspaper size={18} />
                  Noticias
                </button>
              </>
            ) : null}
          </div>

          {accountTab === "account" ? (
            <div className="panel__section account-summary">
              <h3>{text.account}</h3>
              <div className="summary-grid">
                <div>
                  <span>{text.user}</span>
                  <strong>{accountData?.name || "-"}</strong>
                </div>
                <div>
                  <span>Account ID</span>
                  <strong>#{accountData?.id ?? "-"}</strong>
                </div>
                <div>
                  <span>NX Credit</span>
                  <strong style={{ color: "var(--accent, #f59e0b)" }}>{accountData?.nxCredit != null ? accountData.nxCredit.toLocaleString() : "-"}</strong>
                </div>
                <div>
                  <span>NX Prepaid</span>
                  <strong>{accountData?.nxPrepaid != null ? accountData.nxPrepaid.toLocaleString() : "-"}</strong>
                </div>
                <div>
                  <span>{text.characters}</span>
                  <strong>{characters.length}</strong>
                </div>
                <div>
                  <span>Banned</span>
                  <strong>{accountData?.banned ?? "-"}</strong>
                </div>
              </div>

              {characters.length === 0 ? (
                <div className="vote-account-warning" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "12px 16px", marginTop: "12px", fontSize: "0.875rem", color: "var(--text-secondary, #9ca3af)" }}>
                  {language === "es"
                    ? "⚠️ Esta cuenta no tiene personajes creados. Los NX votados se acreditarán a esta cuenta, pero solo los verás en el Cash Shop cuando ingreses con un personaje asociado a ella."
                    : "⚠️ This account has no characters. Vote NX will be credited here, but you will only see it in the Cash Shop when you log in with a character linked to this account."}
                </div>
              ) : (
                <div className="vote-account-info" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", padding: "10px 16px", marginTop: "12px", fontSize: "0.875rem", color: "var(--text-secondary, #9ca3af)" }}>
                  {language === "es"
                    ? `✅ Al votar, los NX se acreditarán a la cuenta "${accountData?.name}" (ID #${accountData?.id}), que tiene ${characters.length} personaje${characters.length !== 1 ? "s" : ""} asociado${characters.length !== 1 ? "s" : ""}.`
                    : `✅ When voting, NX will be credited to account "${accountData?.name}" (ID #${accountData?.id}), which has ${characters.length} associated character${characters.length !== 1 ? "s" : ""}.`}
                </div>
              )}

              <button className="button-secondary" style={{ marginTop: "16px" }} onClick={handleLogout}>{text.logout}</button>
            </div>
          ) : null}

          {accountTab === "profile" ? (
            <div className="panel__section">
              <h3>{text.webProfile}</h3>
              <form className="form-card" onSubmit={submitProfile}>
                <label>
                  {text.displayName}
                  <input name="display_name" value={profileForm.display_name} onChange={handleProfileChange} />
                </label>
                <label>
                  {text.avatarUrl}
                  <input name="avatar_url" value={profileForm.avatar_url} onChange={handleProfileChange} />
                </label>
                <label>
                  {text.bio}
                  <textarea name="bio" value={profileForm.bio} onChange={handleProfileChange} placeholder={text.bioPlaceholder} rows={4}></textarea>
                </label>
                <label>
                  {text.instagram}
                  <input name="instagram_url" value={profileForm.instagram_url} onChange={handleProfileChange} placeholder="@latinms" />
                </label>
                <label>
                  {text.discord}
                  <input name="discord_url" value={profileForm.discord_url} onChange={handleProfileChange} placeholder="usuario#0000" />
                </label>
                <label>
                  {text.website}
                  <input name="website_url" value={profileForm.website_url} onChange={handleProfileChange} placeholder="https://..." />
                </label>
                <label>
                  {text.location}
                  <input name="location" value={profileForm.location} onChange={handleProfileChange} />
                </label>
                <button type="submit" className="button-primary">{text.saveProfile}</button>
              </form>
            </div>
          ) : null}

          {accountTab === "security" ? (
            <div className="panel__section">
              <h3>{text.changePassword}</h3>
              <form className="form-card" onSubmit={submitPassword}>
                <label>
                  {text.currentPassword}
                  <input type="password" name="currentPassword" value={passwordForm.currentPassword} onChange={handlePasswordChange} />
                </label>
                <label>
                  {text.newPassword}
                  <input type="password" name="newPassword" value={passwordForm.newPassword} onChange={handlePasswordChange} />
                </label>
                <label>
                  {text.repeatNew}
                  <input type="password" name="confirmPassword" value={passwordForm.confirmPassword} onChange={handlePasswordChange} />
                </label>
                <button type="submit" className="button-primary">{text.changePassword}</button>
              </form>
            </div>
          ) : null}

          {accountTab === "characters" ? (
            <div className="panel__section">
              <h3>{text.characters}</h3>
              {characters.length === 0 ? <p>{text.noCharacters}</p> : (
                <div className="characters-list">
                  {characters.map((character) => (
                    <div key={character.id} className="character-row">
                      <div className="character-portrait">
                        <img
                          src={getCharacterImage(character)}
                          alt={`${text.characters} ${character.name}`}
                          className="character-avatar"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = "/latinms.png";
                          }}
                        />
                      </div>
                      <div className="character-info">
                        <strong>{character.name}</strong>
                        <span>{getJobName(character.job, language)}</span>
                        <div className="character-stats">
                          <small>Lvl {character.level}</small>
                          <small>Fame {character.fame}</small>
                          <small>Mesos {character.mesos}</small>
                          <small>Map {character.map}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {accountTab === "admin" ? (
            <div className="panel__section">
              <h3>{text.administration}</h3>
              {loadingAdmin && !adminStats ? <p>{text.loadingStats}</p> : adminStats && (
                <>
                  <div className="summary-grid">
                    <article className="metric-card">
                      <strong>{adminStats.onlineUsers}</strong>
                      <span>{text.online}</span>
                    </article>
                    <article className="metric-card">
                      <strong>{adminStats.totalAccounts}</strong>
                      <span>{text.accounts}</span>
                    </article>
                    <article className="metric-card">
                      <strong>{adminStats.totalCharacters}</strong>
                      <span>{text.characters}</span>
                    </article>
                    <article className="metric-card">
                      <strong>{adminStats.bannedAccounts}</strong>
                      <span>{text.banned}</span>
                    </article>
                    <article className="metric-card">
                      <strong>{adminStats.gmCharacters}</strong>
                      <span>GMs</span>
                    </article>
                    <article className="metric-card">
                      <strong>{adminStats.normalCharacters}</strong>
                      <span>{text.players}</span>
                    </article>
                  </div>
                  <div className="split-grid admin-split">
                    <div className="admin-list-container">
                      <h4>{text.latestAccounts}</h4>
                      <div className="ranking-list">
                        {adminStats.latestAccounts.map((account) => (
                          <div key={account.id} className="ranking-row ranking-row--compact">
                            <span>ID: {account.id} - <strong>{account.name}</strong></span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="admin-list-container">
                      <h4>Online Players</h4>
                      <div className="ranking-list">
                        {(() => {
                          const playersToShow = (adminOnlinePlayers && adminOnlinePlayers.length > 0)
                            ? adminOnlinePlayers
                            : (adminStats?.onlineList || adminStats?.onlinePlayers || []);

                          if (playersToShow && playersToShow.length > 0) {
                            return playersToShow.map((p, idx) => (
                              <div key={p.id || p.name || idx} className="ranking-row ranking-row--compact">
                                <span><strong>{p.name || p}</strong>{p.map ? ` - ${p.map}` : ''}</span>
                              </div>
                            ));
                          }

                          return <div className="ranking-row ranking-row--compact"><span>No online players data</span></div>;
                        })()}
                      </div>
                    </div>
                    <div className="admin-list-container">
                      <h4>{text.latestCharacters}</h4>
                      <div className="ranking-list">
                        {adminStats.latestCharacters.map((character) => (
                          <div key={character.id} className="ranking-row ranking-row--compact">
                            <span><strong>{character.name}</strong> (Lvl {character.level}) - {getJobName(character.job, language)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="admin-list-container admin-vote-ranking">
                    <div className="admin-vote-ranking__head">
                      <div>
                        <h4>{language === "es" ? "Ranking de votos" : "Vote ranking"}</h4>
                        <p>{language === "es" ? "Solo votos aceptados; usá este total para premios." : "Accepted votes only; use these totals for rewards."}</p>
                      </div>
                      <span>{language === "es" ? "Top 100" : "Top 100"}</span>
                    </div>
                    {(adminStats.voteRanking || []).length === 0 ? (
                      <p>{language === "es" ? "Todavía no hay votos aceptados para mostrar." : "There are no accepted votes to show yet."}</p>
                    ) : (
                      <div className="admin-vote-ranking__table" role="table" aria-label={language === "es" ? "Ranking de votos aceptados" : "Accepted vote ranking"}>
                        <div className="admin-vote-ranking__row admin-vote-ranking__row--head" role="row">
                          <span>#</span>
                          <span>{language === "es" ? "Cuenta" : "Account"}</span>
                          <span>{language === "es" ? "Votos" : "Votes"}</span>
                          <span>NX</span>
                          <span>{language === "es" ? "Último voto" : "Last vote"}</span>
                        </div>
                        {adminStats.voteRanking.map((vote, index) => (
                          <div key={vote.account_id} className="admin-vote-ranking__row" role="row">
                            <span>{index + 1}</span>
                            <span><strong>{vote.account_name}</strong><small>ID #{vote.account_id}</small></span>
                            <span>{Number(vote.accepted_votes) || 0}</span>
                            <span>{(Number(vote.total_reward_nx) || 0).toLocaleString()}</span>
                            <span>{formatVoteNextAt(vote.last_accepted_vote, language) || "-"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {accountTab === "news" ? (
            <AdminNewsManager
              form={adminNewsForm}
              language={language}
              loading={adminNewsLoading}
              message={adminNewsMessage}
              news={adminNews}
              onChange={handleAdminNewsChange}
              onDelete={deleteAdminNews}
              onEdit={editAdminNews}
              onGalleryImage={handleAdminGalleryImage}
              onImage={handleAdminNewsImage}
              onReset={resetAdminNewsForm}
              onSubmit={submitAdminNews}
            />
          ) : null}

          {accountMessage ? <p className="feedback">{accountMessage}</p> : null}
        </>
      )}
    </section>
  );
}

export default App;
