export type GeographyGuide = {
  id: string;
  name: string;
  pageTitle: string;
  heroImage: { src: string; alt: string; credit?: GeographyPhotoCredit; objectPosition?: string };
  listingSearch: { city?: string; query?: string };
  subtitle: string;
  area: string;
  link: { label: string; href: string };
  historyArchitecture: string;
  schoolsServices: string;
  shopsLeisure: string;
  projectsTransport: string;
  typicalHomes: string;
  nearbyGuideIds?: string[];
  reviewedAt?: string;
  placeType?: "quartier" | "commune";
};

export type GeographyPhotoCredit = {
  title: string;
  creator: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  modification: string;
};

const commonsCredit = (creator: string, fileTitle: string, licenseVersion: "2.0" | "3.0" | "4.0"): GeographyPhotoCredit => ({
  title: fileTitle,
  creator,
  sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileTitle.replace(/ /g, "_"))}`,
  license: `CC BY-SA ${licenseVersion}`,
  licenseUrl: `https://creativecommons.org/licenses/by-sa/${licenseVersion}/deed.fr`,
  modification: "Fichier redimensionné et converti en WebP; cadrage adapté à l’affichage",
});

const commonsByCredit = (creator: string, fileTitle: string, licenseVersion: "1.0" | "2.0" | "3.0" | "4.0"): GeographyPhotoCredit => ({
  title: fileTitle,
  creator,
  sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileTitle.replace(/ /g, "_"))}`,
  license: `CC BY ${licenseVersion}`,
  licenseUrl: `https://creativecommons.org/licenses/by/${licenseVersion}/deed.fr`,
  modification: "Fichier redimensionné et converti en WebP; cadrage adapté à l’affichage",
});

const commonsZeroCredit: GeographyPhotoCredit = {
  title: "Architecture Perret Au Havre (180697579).jpeg",
  creator: "Philippe Roudaut",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Architecture_Perret_Au_Havre_(180697579).jpeg",
  license: "CC0 1.0",
  licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.fr",
  modification: "Fichier redimensionné et converti en WebP; cadrage adapté à l’affichage",
};

const orcherCommonsZeroCredit: GeographyPhotoCredit = {
  title: "Le château d'Orcher. Façade vue de la vallée de la Seine.jpg",
  creator: "VVVCFFrance",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Le_ch%C3%A2teau_d%27Orcher._Fa%C3%A7ade_vue_de_la_vall%C3%A9e_de_la_Seine.jpg",
  license: "CC0 1.0",
  licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.fr",
  modification: "Fichier redimensionné et converti en WebP; cadrage adapté à l’affichage",
};

export const geographyPhotoCredits = {
  panorama: commonsCredit("Martin Falbisoner", "Panorama of Le Havre, September 2019.jpg", "4.0"),
  perret: commonsZeroCredit,
  saintFrancois: commonsCredit("Philippe Alès", "Le Havre (France), quarter Saint-François and Bassin du Roy.JPG", "3.0"),
  saintVincent: commonsCredit("Philippe Alès", "Place Saint-Vincent (France).jpg", "4.0"),
  hallesCentrales: commonsCredit("Florian Pépellin", "Rue Victor Hugo du Havre (juillet 2024).JPG", "4.0"),
  gobelins: commonsByCredit("touzainphilippe", "Rue Georges Braque le Havre 76600 - panoramio.jpg", "3.0"),
  gonfreville: orcherCommonsZeroCredit,
  saintRomain: commonsCredit("Pymouss", "Saint-Romain-de-Colbosc - halle aux blés.JPG", "3.0"),
  laCerlangue: commonsCredit("Pymouss", "La Cerlangue - Église Saint-Jean d'Abbetot 05.jpg", "3.0"),
  etainhus: commonsCredit("Philippe Alès", "Church of Etainhus (France).JPG", "3.0"),
  epretot: commonsCredit("Philippe Alès", "Church of Epretot (France).JPG", "3.0"),
  gommerville: commonsByCredit("Gordito1869", "Schloss Filieres 7.JPG", "3.0"),
  lesTroisPierres: commonsCredit("Pymouss", "Les Trois-Pierres - mairie.JPG", "3.0"),
  saintAubinRoutot: commonsCredit("Pymouss", "Saint-Aubin-Routot - église 01.jpg", "3.0"),
  perrey: commonsCredit("Jean-Christophe BENOIST", "Le Havre - Architecture Perret.jpg", "4.0"),
  centreVille: commonsByCredit("Erik Levilly", "LeHavre.jpg", "1.0"),
  notreDame: commonsCredit("MOSSOT", "Le Havre - Cathédrale Notre-Dame du Havre - Façade occidentale.jpg", "3.0"),
  hotelDeVille: commonsCredit("Marc Ryckaert", "Le Havre Place Hôtel de Ville R05.jpg", "4.0"),
  danton: commonsCredit("Alexandre Prevot", "94, rue Jules Lecesne (52821497550).jpg", "2.0"),
  rogerville: commonsCredit("Philippe Alès", "Église de Rogerville (Seine-Maritime) 1.JPG", "3.0"),
  harfleur: commonsCredit("René Hourdry", "Harfleur Le quai de la Douane le long de la Lézarde et l'église St-Martin.jpg", "4.0"),
  laRemuee: commonsCredit("Pymouss", "La remuée - mairie 01.JPG", "3.0"),
  trouville: commonsCredit("Liberaler Humanist", "The seaside of Trouville sur Mer.jpg", "3.0"),
  saintLaurent: commonsCredit("Pymouss", "Saint-Laurent-de-Brèvedent - centre-bourg.jpg", "3.0"),
  avenueFoch: commonsCredit("Florian Pépellin", "Voie Verte Avenue Foch du Havre (juillet 2024) 1.JPG", "4.0"),
  bleVille: commonsByCredit("touzainphilippe", "Belle petite maison - panoramio.jpg", "3.0"),
};

const havrePanoramaCredit = geographyPhotoCredits.panorama;
const regionalIllustration = {
  src: "/images/geography/pays-de-caux-original.svg",
  alt: "Illustration originale évoquant un bourg et les paysages du pays de Caux",
};

export const geographyGuides: GeographyGuide[] = [
  {
    id: "le-havre",
    name: "Le Havre",
    pageTitle: "Immobilier au Havre",
    heroImage: { src: "/images/geography/panorama-le-havre.webp", alt: "Vue panoramique sur Le Havre et le front de mer", credit: havrePanoramaCredit },
    listingSearch: { city: "le-havre" },
    subtitle: "Ville portuaire, centre reconstruit et quartiers aux identités contrastées",
    area: "Seine-Maritime",
    link: { label: "Patrimoine et projets de la ville", href: "https://lehavre.fr/ma-ville/le-havre-ville-en-mouvement" },
    historyArchitecture: "Fondé en 1517 comme port royal, Le Havre a été lourdement détruit en 1944 puis reconstruit sous la direction d’Auguste Perret. Le centre reconstruit, inscrit au [patrimoine mondial de l’UNESCO](https://lehavre.fr/que-faire-au-havre/lh-culture/panorama/le-havre-patrimoine-mondial-de-lunesco), est marqué par le béton armé, la trame régulière, les rues larges et les immeubles à ossature visible. Saint-François conserve un tissu plus ancien ; les quartiers de coteaux mêlent villas, maisons de brique et silex, et pavillons.",
    schoolsServices: "Écoles, collèges, lycées et établissements d’enseignement supérieur sont répartis dans la ville ; l’[Université Le Havre Normandie](https://www.univ-lehavre.fr/fr/universite/) et les équipements du [Groupe Hospitalier du Havre](https://www.ch-havre.fr/) forment des pôles importants. La [Ville du Havre présente ses quartiers et services de proximité](https://lehavre.fr/ma-ville/vie-des-quartiers) ; les services administratifs, de santé et du quotidien se concentrent notamment dans le centre et les centres de quartier.",
    shopsLeisure: "Les Halles, [l’Espace Coty](https://espace-coty.klepierre.fr/), les rues piétonnes et [les marchés](https://lehavre.fr/services-au-quotidien/commerces-entreprises/les-marches-havrais) complètent une offre commerciale dense. Le front de mer, les jardins suspendus, le parc de Rouelles, le [MuMa](https://www.muma-lehavre.fr/), [le Volcan](https://www.levolcan.com/) et les saisons d’art dans l’espace public offrent des loisirs toute l’année.",
    projectsTransport: "Le tram A/B, le funiculaire, les bus LiA, la gare et les pistes cyclables structurent les déplacements ; consultez les [lignes et horaires LiA](https://www.transports-lia.fr/). Le chantier de la ligne C prévoit 17 stations nouvelles vers les quartiers sud, Harfleur et Montivilliers en 2027. La ville poursuit aussi le [réaménagement des espaces publics du centre reconstruit](https://lehavre.fr/ma-ville/le-havre-ville-en-mouvement/requalification-des-espaces-publics-du-centre-reconstruit) et prépare l’ouverture du centre d’art contemporain en 2027.",
    typicalHomes: "Le parc est diversifié : appartements de la Reconstruction des années 1950–60, immeubles plus anciens en brique et pierre, maisons de ville, villas de coteau et pavillons avec jardin. Les surfaces vont du studio en centre-ville aux maisons familiales de 90 à 150 m² ; ascenseur, stationnement, balcon, vue mer et travaux de copropriété pèsent fortement dans la valeur.",
    nearbyGuideIds: ["centre-ville", "avenue-foch", "halles-centrales", "hotel-de-ville", "notre-dame", "saint-francois", "perrey", "danton", "bleville", "sainte-adresse", "montivilliers"],
  },
  {
    id: "sainte-adresse",
    name: "Sainte-Adresse",
    pageTitle: "Immobilier à Sainte-Adresse",
    heroImage: {
      src: "/images/geography/sainte-adresse-hero.webp",
      alt: "Maisons de Sainte-Adresse sur le coteau qui domine la mer",
      credit: commonsCredit("Florian Pépellin", "Sainte-Adresse depuis la plage du Havre (juillet 2024).JPG", "4.0"),
    },
    listingSearch: { city: "sainte-adresse" },
    subtitle: "Station balnéaire en balcon sur la mer, à la limite ouest du Havre",
    area: "Seine-Maritime",
    link: { label: "Vie locale de Sainte-Adresse", href: "https://www.sainte-adresse.fr/" },
    historyArchitecture: "Ancien village de pêcheurs devenu lieu de villégiature au XIXe siècle, Sainte-Adresse s’est développée sur le coteau face à la Manche. Villas balnéaires de la Belle Époque, maisons bourgeoises, immeubles de bord de mer et pavillons plus récents composent un paysage étagé. La [mairie de Sainte-Adresse](https://www.sainte-adresse.fr/) renseigne sur la vie communale ; les vues, l’exposition au vent et la pente changent beaucoup d’une rue à l’autre.",
    schoolsServices: "La commune dispose d’écoles et de services municipaux de proximité ; collèges, lycées, soins spécialisés et une partie des achats se trouvent aussi au Havre, tout proche. Le relief et les parcours piétons sont à prendre en compte pour les déplacements quotidiens.",
    shopsLeisure: "Le centre-bourg regroupe commerces, restaurants et services. La promenade du littoral, le cap de la Hève et les jardins de la Villa Lecadre offrent des sorties à pied et des panoramas sur l’estuaire. Le Havre apporte rapidement une offre complémentaire de sport, culture et grandes surfaces.",
    projectsTransport: "Les [bus LiA](https://www.transports-lia.fr/) relient Sainte-Adresse au centre du Havre ; l’accès à la gare et au tram passe par la ville voisine. La ligne C du tramway, annoncée pour 2027 vers Montivilliers et Harfleur, renforcera les correspondances à l’échelle havraise. La commune et le Pays d’art et d’histoire travaillent aussi à la mise en valeur du jardin de la Villa Lecadre.",
    typicalHomes: "Villas de caractère parfois divisées en appartements, maisons de ville en pente, résidences avec vue mer et pavillons familiaux dominent. Beaucoup de biens datent de la fin du XIXe ou du début du XXe siècle ; les surfaces sont souvent généreuses. Vérifier toiture, façades, humidité, stationnement et accessibilité sur les terrains pentus.",
    nearbyGuideIds: ["la-plage", "octeville-sur-mer", "le-havre"],
  },
  {
    id: "la-plage",
    name: "La plage et Saint-Vincent",
    pageTitle: "Immobilier plage et Saint-Vincent",
    heroImage: {
      src: "/images/geography/la-plage-hero.webp",
      alt: "Panorama de la plage du Havre et du front de mer de Sainte-Adresse",
      credit: commonsCredit("Florian Pépellin", "Panorama Plage du Havre et Sainte-Adresse (juillet 2024).JPG", "4.0"),
    },
    listingSearch: { city: "le-havre", query: "Saint-Vincent" },
    subtitle: "Front de mer, commerces de quartier et promenades",
    area: "Le Havre · estimation du secteur Saint-Vincent",
    link: { label: "Quartier Saint-Vincent / Gobelins", href: "https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-saint-vincent-gobelins" },
    historyArchitecture: "Le front de mer s’est urbanisé avec l’essor des bains de mer et des promenades au XIXe siècle. Saint-Vincent est un ancien faubourg rattaché au Havre en 1852. On y voit des villas et immeubles anciens, des maisons de ville, puis des constructions de la Reconstruction ; la [Ville du Havre détaille les équipements du secteur Saint-Vincent–Gobelins](https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-saint-vincent-gobelins).",
    schoolsServices: "Le secteur Saint-Vincent-Gobelins compte l’école maternelle Vivaldi, l’école élémentaire Frédéric-Bellanger, une crèche et une aire de jeux. Les établissements secondaires, soins et services publics du centre havrais sont accessibles à pied, en bus ou en tram selon l’adresse.",
    shopsLeisure: "Marché des Gobelins les mercredis et samedis, commerces de quartier, restaurants et cafés. La plage, la promenade, les Bains Maritimes en saison, les activités sportives et les animations d’[Un Été Au Havre](https://www.uneteauhavre.fr/fr/) forment les principaux espaces de loisirs.",
    projectsTransport: "La Ville a pérennisé un plan de circulation apaisé avec itinéraires cyclables et parvis d’école végétalisés ; elle poursuit l’amélioration des services et équipements de plage. Les lignes A/B et les [bus LiA](https://www.transports-lia.fr/) desservent le centre et le littoral ; la ligne de bus « Plage » est une adaptation saisonnière aux chantiers 2026, tandis que la future ligne C doit étendre le réseau en 2027.",
    typicalHomes: "Appartements anciens, maisons de ville et villas côtières côtoient les immeubles de la Reconstruction. Les petits logements proches de la plage sont recherchés pour un pied-à-terre ; les maisons disposent parfois de jardins en retrait. Contrôler exposition aux embruns, état des menuiseries, parties communes, vues réelles et nuisances estivales.",
    nearbyGuideIds: ["perrey", "notre-dame", "sainte-adresse", "gobelins"],
  },
  {
    id: "gobelins",
    name: "Les Gobelins",
    pageTitle: "Immobilier aux Gobelins",
    heroImage: {
      src: "/images/geography/gobelins-rue-georges-braque.webp",
      alt: "La brasserie Paillette, rue Georges-Braque dans le secteur des Gobelins au Havre, photographie de 2011",
      credit: geographyPhotoCredits.gobelins,
    },
    listingSearch: { city: "le-havre", query: "Gobelins" },
    subtitle: "Un quartier résidentiel entre le centre et le littoral",
    area: "Le Havre · repère Place des Gobelins",
    link: { label: "Équipements du quartier", href: "https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-saint-vincent-gobelins" },
    historyArchitecture: "Les Gobelins faisaient partie de la basse commune de Sanvic, annexée au Havre en 1852. Le quartier s’est développé comme faubourg habité à proximité du centre et de la mer. Le bâti mêle maisons de ville et immeubles d’avant-guerre, petites copropriétés, villas et constructions de la Reconstruction ; la [Ville publie les équipements et actualités du quartier](https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-saint-vincent-gobelins).",
    schoolsServices: "Le secteur bénéficie des écoles Vivaldi et Frédéric-Bellanger, de la crèche Charles-Auguste-Marande, d’un relais petite enfance et d’équipements associatifs proches. Les autres niveaux scolaires, les services de santé et les démarches administratives se trouvent dans les quartiers voisins du Havre.",
    shopsLeisure: "Le marché alimentaire des Gobelins se tient deux fois par semaine rue du Président-Wilson. Commerces, cafés et restaurants de Saint-Vincent et du centre sont proches ; plage, promenade du littoral, aires de jeux et équipements sportifs complètent les sorties.",
    projectsTransport: "Le parvis des écoles a été végétalisé et les rues ont bénéficié d’un plan de circulation avec sens uniques et liaisons cyclables sécurisées. Bus LiA et tram du centre facilitent les déplacements ; la ligne C en chantier doit compléter le réseau havrais en 2027. La mise en valeur du front de mer se poursuit à l’échelle du quartier.",
    typicalHomes: "On trouve surtout des appartements dans de petites copropriétés, des maisons mitoyennes et quelques villas, généralement de surfaces compactes à familiales (environ 40–120 m²). Les biens anciens ont souvent du cachet mais peuvent demander une rénovation énergétique ou des travaux de façade ; jardin, garage et stationnement sont rares dans les rues les plus denses.",
    nearbyGuideIds: ["la-plage", "saint-michel", "centre-ville"],
  },
  {
    id: "saint-michel",
    name: "Saint-Michel",
    pageTitle: "Immobilier à Saint-Michel",
    heroImage: {
      src: "/images/geography/saint-michel-hero.webp",
      alt: "Église Saint-Michel et immeubles du centre du Havre",
      credit: commonsCredit("Alexandre Prevot", "Église Saint-Michel du Havre (52295658762).jpg", "2.0"),
    },
    listingSearch: { city: "le-havre", query: "Saint-Michel" },
    subtitle: "Un secteur de coteau proche du centre et des transports",
    area: "Le Havre · repère Parvis Saint-Michel",
    link: { label: "Patrimoine et règles du centre havrais", href: "https://lehavre.fr/services-au-quotidien/habitat-urbanisme/travaux-en-secteur-protege-patrimoine-unesco" },
    historyArchitecture: "Saint-Michel se situe sur les hauteurs à l’ouest du centre. Le secteur a grandi avec les faubourgs du XIXe siècle, puis a été complété par les opérations de la Reconstruction. Le tissu alterne petits immeubles de brique et pierre, maisons de ville, pavillons sur les pentes et ensembles plus récents ; les escaliers et dénivelés font partie du paysage urbain. Les ressources du [Pays d’art et d’histoire](https://www.lehavreseine-patrimoine.fr/) donnent des repères complémentaires sur le patrimoine havrais.",
    schoolsServices: "Les écoles et services du centre havrais sont accessibles à pied ou en bus ; collèges, lycées, commerces, soins et équipements administratifs se répartissent dans les quartiers voisins. Pour un achat familial, vérifier l’itinéraire réel vers l’école, les arrêts et la pente depuis le logement.",
    shopsLeisure: "La proximité du centre apporte commerces, marché, restaurants, médiathèques et services. Les squares et jardins de quartier offrent des pauses de proximité ; la plage, le square Saint-Roch, les musées et les équipements culturels du centre se rejoignent rapidement.",
    projectsTransport: "Le funiculaire relie la ville haute à la ville basse ; bus LiA et tramway sont accessibles selon l’adresse. Une maintenance du funiculaire et des travaux de voirie ont été programmés en 2026. À l’échelle de la ville, la ligne C est en travaux pour une mise en service annoncée en 2027 ; le PLUi approuvé en 2026 encadre les évolutions de construction et de patrimoine.",
    typicalHomes: "Petits et moyens appartements en immeubles anciens ou de la Reconstruction, maisons de ville et pavillons de coteau. Les logements font souvent 40 à 100 m², avec des variations d’étage, de luminosité et d’accès liées au relief. Examiner l’isolation, les façades, la copropriété et la facilité de stationnement.",
    nearbyGuideIds: ["centre-ville", "gobelins", "perrey"],
  },
  {
    id: "octeville-sur-mer",
    name: "Octeville-sur-Mer",
    pageTitle: "Immobilier à Octeville-sur-Mer",
    heroImage: {
      src: "/images/geography/octeville-sur-mer-hero.webp",
      alt: "Église Saint-Martin et maisons du centre d'Octeville-sur-Mer",
      credit: commonsCredit("Philippe Alès", "Octeville-sur-Mer (France), center and church.JPG", "3.0"),
    },
    listingSearch: { query: "Octeville-sur-Mer" },
    subtitle: "Bourg résidentiel entre campagne, falaise et agglomération",
    area: "Seine-Maritime",
    link: { label: "Écoles et équipements communaux", href: "https://www.octevillesurmer.fr/etablissements-scolaires" },
    historyArchitecture: "Ancienne commune rurale en surplomb de la Manche, Octeville-sur-Mer a gardé un cœur de bourg autour de son église et de ses bâtiments communaux. Le patrimoine domestique mêle longères et fermes normandes en brique, silex et colombages, maisons de bourg, puis pavillons construits avec l’extension résidentielle du XXe siècle. La [mairie présente les informations et services aux habitants](https://www.octevillesurmer.fr/etablissements-scolaires).",
    schoolsServices: "L’école maternelle Les Lutins et les deux sites élémentaires Jules-Verne 1 et Jules-Verne 2 (Les Falaises) accueillent les enfants jusqu’au CM2, avec restauration et périscolaire. Le collège de secteur se trouve à Montivilliers ; médiathèque, accueil petite enfance et complexe sportif Michel-Adam complètent les équipements communaux.",
    shopsLeisure: "Le bourg propose des commerces et services de proximité, associations et équipements municipaux. Les chemins ruraux, les paysages de plateau et les sentiers vers le littoral donnent accès à des promenades ; la plage et les équipements culturels du Havre restent proches.",
    projectsTransport: "Des projets communaux portent sur le centre-bourg et la place Foch, les équipements partagés et la production solaire sur certains bâtiments. Les [bus LiA](https://www.transports-lia.fr/) relient la commune au Havre, mais la voiture reste pratique pour les trajets périphériques. Le futur tram C desservira Montivilliers en 2027, avec correspondance à l’échelle de l’agglomération.",
    typicalHomes: "Le marché est dominé par les maisons individuelles, pavillons familiaux et propriétés avec jardin ; quelques appartements se trouvent dans le bourg ou des résidences récentes. Les maisons des années 1970 à aujourd’hui côtoient des longères et bâtisses anciennes, souvent entre 90 et 160 m². Examiner assainissement, toiture, terrain, exposition aux vents et temps de trajet.",
  },
  {
    id: "montivilliers",
    name: "Montivilliers",
    pageTitle: "Immobilier à Montivilliers",
    heroImage: {
      src: "/images/geography/montivilliers-hero.webp",
      alt: "Abbaye bénédictine et place historique de Montivilliers",
      credit: commonsCredit("Velvet", "Montivilliers abbaye.JPG", "3.0"),
    },
    listingSearch: { city: "montivilliers" },
    subtitle: "Ville-centre patrimoniale et pôle de services de l’estuaire",
    area: "Seine-Maritime",
    link: { label: "Histoire et patrimoine de l’abbaye", href: "https://www.ville-montivilliers.fr/bouger-sortir/histoire-et-patrimoine/" },
    historyArchitecture: "L’histoire de Montivilliers s’organise autour de son abbaye bénédictine, fondée au VIIe siècle et reconstruite à partir du XIe. Église romane, cloître, réfectoire gothique et logis anciens composent le cœur historique. Le bâti alentour va des maisons de bourg et maisons à pans de bois aux immeubles et pavillons plus récents dans les quartiers résidentiels. La [Ville de Montivilliers détaille son patrimoine et ses services](https://www.ville-montivilliers.fr/).",
    schoolsServices: "Montivilliers réunit écoles, collèges, équipements sportifs, services de santé et gare. La reconstruction de l’école élémentaire Victor-Hugo a commencé en 2026 ; un pôle de santé et des logements/activités complètent les projets de centralité annoncés par la ville.",
    shopsLeisure: "Le centre et les zones commerciales proposent commerces, supermarchés, restaurants et services. L’abbaye, la bibliothèque Condorcet, les salles de spectacle, les berges de la Lézarde et les chemins des anciens moulins offrent des sorties à pied ou en famille.",
    projectsTransport: "La gare TER relie Le Havre et Fécamp ; les [bus LiA](https://www.transports-lia.fr/), le réseau routier et les pistes cyclables complètent l’accès. Le prolongement de la ligne C du tramway vers Montivilliers est annoncé pour 2027. Le site de l’abbaye doit poursuivre sa transformation culturelle jusqu’en 2027, avec intégration de la bibliothèque et nouveaux espaces d’activités.",
    typicalHomes: "Appartements en centre et résidences récentes, maisons de ville et maisons familiales avec jardin. Le centre ancien offre des logements de caractère parfois compacts ; en périphérie, pavillons des années 1960–2000 et maisons plus récentes sont fréquents, souvent autour de 85 à 140 m². Vérifier risques de ruissellement près de la Lézarde, stationnement et travaux patrimoniaux.",
  },
  {
    id: "maneglise",
    name: "Manéglise",
    pageTitle: "Immobilier à Manéglise",
    heroImage: {
      src: "/images/geography/maneglise-hero.webp",
      alt: "Église Saint-Germain à Manéglise",
      credit: commonsCredit("Pymouss", "Manéglise - Église Saint-Germain 01.JPG", "3.0"),
    },
    listingSearch: { city: "maneglise" },
    subtitle: "Village rural préservé à l’ouest de l’agglomération havraise",
    area: "Seine-Maritime · repère de ventes DVF",
    link: { label: "Histoire du village", href: "https://maneglise.fr/decouvrir-la-commune/histoire-du-village/" },
    historyArchitecture: "Le village possède une église romane, des fermes anciennes et des traces d’un habitat seigneurial, notamment autour du château des Hellandes. La commune a grandi depuis les années 1970 avec des lotissements tout en conservant un paysage bocager. L’architecture va des longères en brique et silex aux maisons de bourg et pavillons familiaux. La [fiche communale de Manéglise](https://www.lehavreseinemetropole.fr/annuaire-des-communes/maneglise) centralise les informations pratiques.",
    schoolsServices: "École communale, restauration scolaire, associations et salle de sport structurent la vie locale. Un commerce multiservice, un salon de coiffure, un cabinet infirmier et des services de proximité sont présents ; collège, lycée, médecins et achats plus larges se trouvent dans les bourgs voisins.",
    shopsLeisure: "La vie associative, les fêtes communales et les équipements sportifs animent le village. Les chemins de campagne, haies et espaces agricoles apportent un cadre de promenade ; pour les loisirs, commerces et équipements de Montivilliers, Saint-Romain et du Havre élargissent le choix.",
    projectsTransport: "La commune a inscrit dans ses projets le maintien du commerce de proximité, l’amélioration d’équipements et la maîtrise de l’urbanisation. Les cars régionaux et les routes départementales relient les bourgs voisins ; pour les trajets fréquents vers Le Havre, vérifier les horaires, les correspondances et la dépendance à la voiture.",
    typicalHomes: "Maisons individuelles majoritaires : longères, maisons de bourg, anciennes fermes avec dépendances et pavillons de lotissement (souvent 90–150 m²). Les terrains sont généralement plus grands qu’en ville ; les appartements et studios sont peu courants. Contrôler assainissement individuel, servitudes, état des granges et coût énergétique des maisons anciennes.",
  },
  {
    id: "gainneville",
    name: "Gainneville",
    pageTitle: "Immobilier à Gainneville",
    heroImage: {
      src: "/images/geography/gainneville-hero.webp",
      alt: "Ancienne mairie-école de Gainneville en brique et silex",
      credit: commonsCredit("Pymouss", "Gainneville - mairie-école.jpg", "3.0"),
    },
    listingSearch: { city: "gainneville" },
    subtitle: "Bourg familial en croissance entre Le Havre et l’estuaire",
    area: "Seine-Maritime · 25 ventes DVF en 2025",
    link: { label: "Projet de territoire et cadre de vie", href: "https://gainneville.fr/cadre-de-vie/projet-de-territoire/" },
    historyArchitecture: "Gainneville est un ancien village du pays de Caux, formé autour de son bourg et de ses terres agricoles. Le bâti associe maisons de brique et silex, anciennes fermes, maisons de bourg et lotissements pavillonnaires. Le tissu résidentiel récent conserve généralement des jardins et des stationnements privatifs. Les [actualités et services de la mairie](https://gainneville.fr/) complètent ces repères locaux.",
    schoolsServices: "Le groupe scolaire Louis-Aragon, bibliothèque, accueil jeunesse, équipements municipaux et associations répondent aux besoins de proximité. La commune signale également des projets de maison médicale et des logements ; pour les soins spécialisés, lycées et services plus diversifiés, les pôles voisins du Havre et d’Harfleur sont proches.",
    shopsLeisure: "Commerces et marché, bibliothèque, salles et équipements associatifs sont présents dans le bourg. Les espaces verts et sentiers du territoire offrent des promenades ; les grandes zones commerciales et les loisirs de l’agglomération restent accessibles en voiture ou en bus.",
    projectsTransport: "Le projet de territoire met l’accent sur la qualité architecturale, la réduction de l’étalement, la valorisation des espaces verts et la circulation. Le projet du site des Jonquilles a obtenu un permis d’aménager : logements diversifiés et préservation/réhabilitation d’éléments bâtis et arborés sont prévus. Bus et routes desservent Le Havre ; la voiture reste utile pour plusieurs trajets quotidiens.",
    typicalHomes: "Le parc est très majoritairement composé de maisons individuelles, des maisons anciennes du bourg aux pavillons des années 1970–2020, souvent de 85 à 130 m² avec jardin et garage. Quelques appartements existent mais sont rares. Examiner l’état énergétique, la proximité des axes, le risque de ruissellement et l’avancement des aménagements autour du site des Jonquilles.",
  },
  {
    id: "saint-romain",
    name: "Saint-Romain-de-Colbosc",
    pageTitle: "Immobilier à Saint-Romain-de-Colbosc",
    heroImage: {
      src: "/images/geography/saint-romain-de-colbosc.webp",
      alt: "La halle aux blés historique de Saint-Romain-de-Colbosc",
      credit: geographyPhotoCredits.saintRomain,
      objectPosition: "center 40%",
    },
    listingSearch: { query: "Saint-Romain-de-Colbosc" },
    subtitle: "Bourg-centre commerçant au cœur du pays de Caux",
    area: "Seine-Maritime",
    link: { label: "Informations et projets de la commune", href: "https://www.stromain76.fr/" },
    historyArchitecture: "Bourg historique du pays de Caux, Saint-Romain s’est développé autour de son église, de ses marchés et des routes reliant les villages environnants. Le centre mêle maisons de bourg en brique et silex, commerces en rez-de-chaussée et bâtisses anciennes ; les quartiers périphériques sont plus pavillonnaires, avec jardins et vues sur la campagne. La [mairie de Saint-Romain-de-Colbosc](https://www.stromain76.fr/) publie les informations communales.",
    schoolsServices: "Écoles, collège, services de santé et équipements publics font de Saint-Romain un pôle pratique pour les communes alentour. La ville accueille également des services intercommunaux ; vérifier le secteur scolaire et les temps de trajet vers les établissements selon l’adresse.",
    shopsLeisure: "Le centre commerçant, marché, supermarchés, restaurants, services et équipements sportifs couvrent une large part des besoins courants. Les chemins ruraux et espaces agricoles environnants proposent un cadre de promenade, tandis que les associations et équipements communaux offrent des loisirs de proximité.",
    projectsTransport: "Les cars régionaux NOMAD relient Le Havre et les bourgs du pays de Caux ; les axes routiers donnent accès à l’A29. La reconversion de l’ancienne perception du centre doit démarrer à l’hiver 2026–2027 dans le cadre de Petites Villes de Demain. La future ligne C vers Montivilliers en 2027 améliorera l’accès au réseau métropolitain via les correspondances havraises.",
    typicalHomes: "Maisons de bourg, maisons de maître, petites copropriétés au centre et pavillons familiaux en périphérie. Les surfaces courantes vont d’appartements de 40–80 m² à des maisons de 90–150 m² avec jardin. Les biens anciens peuvent demander des travaux d’isolation ou de toiture ; les pavillons récents offrent souvent garage et stationnement.",
    nearbyGuideIds: ["gainneville", "saint-laurent-de-brevedent", "etainhus", "epretot"],
  },
  {
    id: "etretat",
    name: "Étretat",
    pageTitle: "Immobilier à Étretat",
    heroImage: {
      src: "/images/geography/etretat-hero.webp",
      alt: "Vue panoramique sur le village, la plage et les falaises d'Étretat",
      credit: commonsCredit("Jörg Braukmann", "Vue d'Étretat.jpg", "4.0"),
    },
    listingSearch: { query: "Étretat" },
    subtitle: "Station littorale et village de vallée au pied des falaises",
    area: "Seine-Maritime",
    link: { label: "Urbanisme, patrimoine et vie pratique", href: "https://etretat.fr/vie-pratique/" },
    historyArchitecture: "Port de pêche devenu station de bains de mer au XIXe siècle, Étretat a attiré artistes et villégiateurs. Le village se compose de maisons de pêcheurs et de commerçants, villas balnéaires, maisons bourgeoises en brique et pierre, et quelques immeubles de rapport. Les falaises, la valleuse et les vues sont protégées par des règles patrimoniales et paysagères ; la [mairie d’Étretat renseigne sur l’urbanisme et les services](https://etretat.fr/vie-pratique/).",
    schoolsServices: "École, cantine, garderie, bibliothèque, commerces et services municipaux assurent une offre de proximité. Les collèges, lycées, soins spécialisés et certaines courses se trouvent dans les bourgs voisins ; anticiper la saisonnalité des services et les déplacements hors du village.",
    shopsLeisure: "Commerces, restaurants, marché, plage, jardins, sentier littoral GR21, falaises d’Aval et d’Amont, Clos Lupin et équipements sportifs structurent la vie locale. La fréquentation touristique estivale peut modifier la circulation, le stationnement et l’ambiance du centre.",
    projectsTransport: "La commune est engagée dans l’Opération Grand Site des Falaises d’Étretat–Côte d’Albâtre, avec des enjeux de gestion des flux, stationnement et protection du littoral. Cars NOMAD et lignes LiA relient Étretat au Havre, à Fécamp et aux gares de Bréauté-Beuzeville ; certaines périodes proposent une liaison train + car. Pas de gare dans la commune.",
    typicalHomes: "Maisons de pêcheurs mitoyennes, petites maisons de bourg, villas balnéaires et appartements de villégiature composent l’offre. Les petites maisons centrales sont souvent anciennes et compactes (environ 50–90 m²) ; villas et maisons familiales peuvent dépasser 120 m². Vérifier humidité, toiture, contraintes patrimoniales, risques littoraux, stationnement et éventuelle exploitation saisonnière.",
  },
  {
    id: "deauville",
    name: "Deauville",
    pageTitle: "Immobilier à Deauville",
    heroImage: {
      src: "/images/geography/deauville-hero.webp",
      alt: "Les Planches et la plage de Deauville",
      credit: commonsCredit("Remi Mathis", "2023 Deauville 03.jpg", "4.0"),
    },
    listingSearch: { query: "Deauville" },
    subtitle: "Station balnéaire, commerces, courses hippiques et vie culturelle",
    area: "Calvados",
    link: { label: "Patrimoine et services de Deauville", href: "https://www.deauville.fr/" },
    historyArchitecture: "Créée comme station balnéaire à partir de 1860, Deauville s’est structurée avec hôtels, casino, villas et grands équipements. Son architecture éclectique emprunte aux styles normand, néo-médiéval, classique et anglo-normand : colombages décoratifs, tourelles, bow-windows, balcons et toitures complexes. La [Ville de Deauville publie les informations sur le patrimoine](https://www.deauville.fr/) ; la réglementation protège plusieurs ensembles et perspectives.",
    schoolsServices: "Écoles, collèges, lycée et structures petite enfance s’ajoutent aux services de santé, commerces et équipements de la communauté de communes. Les quartiers résidentiels de l’arrière-ville sont plus quotidiens et familiaux que les abords de la plage, particulièrement animés en saison.",
    shopsLeisure: "Rue Eugène-Colas, marché, commerces, restaurants, plage, Planches, casino, hippodrome, golf, centre culturel et équipements sportifs. Les services restent variés toute l’année, avec davantage d’animations et de fréquentation lors des festivals, des courses et des vacances.",
    projectsTransport: "La gare de Trouville–Deauville relie la ville à Paris et au réseau TER Normandie ; bus NOMAD, marche et vélo facilitent les trajets locaux. Les projets de rénovation et de protection du patrimoine doivent être suivis via le Site patrimonial remarquable et le PLUi ; toute transformation d’une villa peut être soumise à autorisation spécifique.",
    typicalHomes: "Studios et appartements de villégiature dans des résidences de la fin XIXe au XXe siècle, villas bourgeoises et maisons anglo-normandes, ainsi que résidences récentes. Les surfaces vont du studio de 20–35 m² aux villas familiales de 150 m² et plus. Ascenseur, balcon, parking, proximité plage, qualité de rénovation et contraintes patrimoniales sont déterminants.",
  },
  {
    id: "trouville",
    name: "Trouville-sur-Mer",
    pageTitle: "Immobilier à Trouville-sur-Mer",
    heroImage: {
      src: "/images/geography/trouville-plage-villas.webp",
      alt: "Villas balnéaires et promenade en bord de plage à Trouville-sur-Mer",
      credit: geographyPhotoCredits.trouville,
      objectPosition: "center 38%",
    },
    listingSearch: { query: "Trouville-sur-Mer" },
    subtitle: "Port de pêche, station de bord de mer et quartiers en coteau",
    area: "Calvados",
    link: { label: "Patrimoine, écoles et actualités de la ville", href: "https://www.trouville.fr/ma-ville/" },
    historyArchitecture: "Ancien port de pêche, Trouville est devenue une station balnéaire réputée au XIXe siècle. Le centre garde des maisons de pêcheurs, des immeubles étroits, des villas balnéaires et des hôtels particuliers. Colombages, brique, pierre, bow-windows et toitures à forte pente reflètent les styles normands et éclectiques ; la [Ville de Trouville-sur-Mer présente ses informations patrimoniales et pratiques](https://www.trouville.fr/ma-ville/).",
    schoolsServices: "Écoles Louis-Delamare et René-Coty, collège, services de santé, mairie et équipements municipaux répondent aux besoins du quotidien. Certains établissements sont situés sur les hauteurs ou à Hennequeville ; vérifier les trajets, dénivelés, transports scolaires et services selon le quartier.",
    shopsLeisure: "Le marché aux poissons, le port, les commerces du boulevard Fernand-Moureaux, les restaurants, la plage, la piscine et la Villa Montebello structurent les loisirs et la vie locale. Le centre dense se parcourt à pied, tandis que les quartiers hauts offrent un cadre plus résidentiel.",
    projectsTransport: "La gare Trouville–Deauville, les cars NOMAD, les lignes locales et les liaisons piétonnes assurent l’accès régional. Le réaménagement de la rue des Bains et la modernisation de réseaux sont en cours à partir de septembre 2026 ; la commune suit aussi la rénovation du patrimoine religieux et l’aménagement des espaces publics.",
    typicalHomes: "Appartements dans des immeubles anciens et résidences de villégiature, maisons de pêcheurs de petite surface, villas en coteau et maisons familiales à Hennequeville. Le bâti va du XIXe siècle aux résidences contemporaines. Escaliers, absence d’ascenseur, humidité, stationnement, bruit saisonnier et vues réelles doivent être évalués sur place.",
  },
];

type AdditionalGuideInput = {
  id: string;
  name: string;
  pageTitle: string;
  heroImage: GeographyGuide["heroImage"];
  listingSearch: GeographyGuide["listingSearch"];
  subtitle: string;
  area: string;
  link: GeographyGuide["link"];
  historyArchitecture: string;
  schoolsServices: string;
  shopsLeisure: string;
  projectsTransport: string;
  typicalHomes: string;
  nearbyGuideIds: string[];
  reviewedAt?: string;
  placeType: "quartier" | "commune";
};

const lhsmCommunesLink = "https://www.lehavreseinemetropole.fr/54-communes";
const lhsmTown = (slug: string) => `https://www.lehavreseinemetropole.fr/annuaire-des-communes/${slug}`;
const cityscape = regionalIllustration;

function additionalGuide(input: AdditionalGuideInput): GeographyGuide {
  return { ...input };
}

const additionalGeographyGuides: GeographyGuide[] = [
  additionalGuide({
    id: "halles-centrales", reviewedAt: "2026-10-06", name: "Halles Centrales", pageTitle: "Immobilier aux Halles Centrales au Havre",
    heroImage: { src: "/images/geography/halles-centrales.webp", alt: "Rue Victor Hugo, rue piétonne du centre-ville du Havre, à proximité des Halles Centrales", credit: geographyPhotoCredits.hallesCentrales, objectPosition: "center 58%" },
    listingSearch: { city: "le-havre", query: "Halles" },
    subtitle: "Un secteur commerçant du centre reconstruit, autour du marché couvert et près du Volcan", area: "Le Havre · centre reconstruit · secteur des Halles Centrales",
    link: { label: "Halles Centrales et patrimoine architectural : Ville du Havre", href: "https://lehavre.fr/que-faire-au-havre/lh-culture/panorama/ville-des-modernites-architecturales" },
    historyArchitecture: "Les Halles Centrales sont un secteur du centre-ville du Havre, et non une commune distincte. Le marché couvert a retrouvé son emplacement d’avant-guerre au sein du centre reconstruit. La [Ville du Havre documente son architecture](https://lehavre.fr/que-faire-au-havre/lh-culture/panorama/ville-des-modernites-architecturales) et sa rénovation de 1999. Les rues voisines associent logements de la Reconstruction et commerces en rez-de-chaussée.",
    schoolsServices: "Le collège Raoul-Dufy est un repère scolaire du secteur, identifié dans le [dossier patrimonial municipal](https://lehavre.fr/sites/default/files/fichier/dossier_candidature_havre_patrimoine_mondial.pdf). L’affectation scolaire dépend de l’adresse et se confirme auprès de la Ville. L’[Hôtel de Ville](https://lehavre.fr/annuaire-equipements/hotel-de-ville) donne accès aux services municipaux du centre.",
    shopsLeisure: "Le marché couvert, les commerces alimentaires et les rues voisines forment le cœur de la vie locale. Le [marché dominical des Halles Centrales](https://lehavre.fr/services-au-quotidien/commerces-entreprises/les-marches-havrais) complète cette offre ; consulter les horaires municipaux avant une visite. Le [Volcan](https://www.levolcan.com/), [la bibliothèque Oscar Niemeyer](https://bibliotheques.lehavre.fr/bibliotheque/bibliotheque-oscar-niemeyer) et les quais proposent des sorties à proximité.",
    projectsTransport: "Les déplacements à pied relient les Halles aux autres secteurs du centre. Les [plans et horaires LiA](https://www.transports-lia.fr/) permettent de préparer les correspondances en bus et en tram. Pour les travaux et les changements de circulation, suivre le [projet municipal du centre reconstruit](https://lehavre.fr/ma-ville/le-havre-ville-en-mouvement/requalification-des-espaces-publics-du-centre-reconstruit), sans assimiler son périmètre à toutes les rues des Halles.",
    typicalHomes: "Appartements de la Reconstruction, petites surfaces et logements familiaux composent l’essentiel des recherches dans ce secteur. Pour acheter, vérifier luminosité, ascenseur, isolation, travaux de copropriété et stationnement. La présence de commerces, livraisons et terrasses invite à visiter à plusieurs moments de la journée.",
    nearbyGuideIds: ["centre-ville", "hotel-de-ville", "notre-dame", "perrey", "saint-francois"], placeType: "quartier",
  }),
  additionalGuide({
    id: "hotel-de-ville", reviewedAt: "2026-09-30", name: "Hôtel de Ville", pageTitle: "Immobilier près de l’Hôtel de Ville du Havre",
    heroImage: { src: "/images/geography/hotel-de-ville.webp", alt: "Jardins et place de l’Hôtel de Ville du Havre", credit: geographyPhotoCredits.hotelDeVille },
    listingSearch: { city: "le-havre", query: "Hôtel de Ville" },
    subtitle: "La place, ses jardins et les rues voisines au cœur du centre reconstruit", area: "Le Havre · centre reconstruit · secteur de l’Hôtel de Ville",
    link: { label: "Services et accès à l’Hôtel de Ville : fiche officielle", href: "https://lehavre.fr/annuaire-equipements/hotel-de-ville" },
    historyArchitecture: "L’Hôtel de Ville est un repère du centre reconstruit du Havre ; le secteur présenté désigne la place et ses rues voisines. Les [Archives municipales retracent sa construction et son inauguration en 1958](https://archives.lehavre.fr/expositions/lhotel-de-ville-du-havre-1958-2018-symbole-de-la-reconstruction). Les perspectives, les jardins et les immeubles de la Reconstruction structurent ce cadre urbain.",
    schoolsServices: "La mairie centrale accueille des démarches et services publics ; la [fiche officielle de l’Hôtel de Ville](https://lehavre.fr/annuaire-equipements/hotel-de-ville) précise les accès. Les écoles et établissements secondaires se choisissent selon l’adresse et la carte scolaire. L’[Université Le Havre Normandie](https://www.univ-lehavre.fr/fr/universite/) constitue un pôle d’enseignement supérieur à l’échelle de la ville.",
    shopsLeisure: "Les jardins de la place, les commerces du centre, les Halles Centrales et les rues piétonnes composent le quotidien. Le [Volcan](https://www.levolcan.com/) et le [MuMa](https://www.muma-lehavre.fr/) complètent l’offre culturelle du centre et du front de mer. Les programmations sont à consulter auprès de chaque établissement.",
    projectsTransport: "Le tramway et les [bus LiA](https://www.transports-lia.fr/) desservent le centre ; vérifier les arrêts et correspondances selon le trajet. Les projets et modifications de circulation sont publiés par la Ville et la métropole. Une visite sur place permet d’apprécier les cheminements, l’accès au stationnement et l’animation de la place.",
    typicalHomes: "Appartements de la Reconstruction et logements familiaux sont les principaux biens recherchés autour de la place. Les étages, l’orientation, la vue, l’ascenseur, les charges et les travaux créent des différences importantes. Vérifier les possibilités de rénovation dans le périmètre patrimonial ainsi que l’exposition au bruit des axes proches.",
    nearbyGuideIds: ["centre-ville", "halles-centrales", "saint-michel", "perrey", "gobelins"], placeType: "quartier",
  }),
  additionalGuide({
    id: "avenue-foch", reviewedAt: "2026-10-06", name: "Avenue Foch", pageTitle: "Immobilier avenue Foch au Havre",
    heroImage: { src: "/images/geography/avenue-foch-voie-verte.webp", alt: "La voie verte de l’avenue Foch au Havre, entre les immeubles du centre reconstruit", credit: geographyPhotoCredits.avenueFoch, objectPosition: "center 55%" },
    listingSearch: { city: "le-havre", query: "Avenue Foch" },
    subtitle: "Une grande avenue du centre-ville, près du square Saint-Roch et des commerces", area: "Le Havre · centre-ville",
    link: { label: "Le square Saint-Roch : histoire et accès", href: "https://lehavre.fr/annuaire-equipements/le-square-saint-roch" },
    historyArchitecture: "L’avenue Foch traverse le centre-ville du Havre. Le square Saint-Roch s’ouvre sur l’avenue ; la [Ville du Havre en présente l’histoire et les accès](https://lehavre.fr/annuaire-equipements/le-square-saint-roch).",
    schoolsServices: "Les commerces et services du centre sont accessibles depuis l’avenue. Les équipements scolaires et les services publics se vérifient selon l’adresse et le trajet recherché.",
    shopsLeisure: "Le square Saint-Roch, les commerces de l’avenue Foch, les Halles Centrales et la plage offrent plusieurs repères du quotidien dans ce secteur du centre-ville.",
    projectsTransport: "Le tramway, les bus LiA et les cheminements piétons desservent le centre du Havre. Consultez les lignes et horaires LiA pour préparer un trajet depuis l’adresse concernée.",
    typicalHomes: "Les logements du secteur varient selon le tronçon et l’immeuble. Pour comparer des biens, vérifier l’étage, l’ascenseur, la luminosité, les charges, l’état de la copropriété et l’exposition à la circulation.",
    nearbyGuideIds: ["centre-ville", "hotel-de-ville", "perrey", "la-plage"], placeType: "quartier",
  }),

  additionalGuide({
    id: "notre-dame", name: "Notre-Dame", pageTitle: "Immobilier dans le quartier Notre-Dame au Havre",
    heroImage: { src: "/images/geography/notre-dame-cathedral.webp", alt: "Façade occidentale de la cathédrale Notre-Dame du Havre", credit: geographyPhotoCredits.notreDame },
    listingSearch: { city: "le-havre", query: "Notre-Dame" },
    subtitle: "Le premier quartier du Havre, entre la cathédrale, les bassins et les quais", area: "Le Havre · quartier central",
    link: { label: "Vie locale et équipements de Notre-Dame / Saint-François", href: "https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-notre-dame-saint-francois" },
    historyArchitecture: "Le Havre est fondé en 1517 et Notre-Dame en est le premier quartier. En 1541, François Ier confie à Girolamo Bellarmato son extension à l’est du bassin du Roy : rues rectilignes, places et perspectives s’inspirent de la Renaissance italienne. La cathédrale conserve plusieurs périodes de construction, du gothique tardif au baroque. Retrouvez les repères patrimoniaux auprès du [Pays d’art et d’histoire Le Havre Seine Métropole](https://www.lehavreseine-patrimoine.fr/).",
    schoolsServices: "L’école maternelle Percanville et l’école élémentaire Dauphine figurent parmi les équipements municipaux du secteur. La crèche Videcoq, à la tour Alta, accueille les familles ; collèges, lycées, soins et administrations se trouvent dans le centre proche. La sectorisation scolaire dépend de l’adresse et se vérifie auprès de la Ville.",
    shopsLeisure: "Le marché aux poissons du quai de l’Île anime le bassin plusieurs jours par semaine, à proximité de commerces, restaurants et services du centre. Le Muséum d’histoire naturelle, le Musée de l’Armateur, le bassin du Roy et le Grand Quai composent un quotidien très accessible à pied.",
    projectsTransport: "La Ville a réaménagé la place du Vieux-Marché et poursuit les travaux autour du marché aux poissons et de la place du Père Arson. Bus LiA, tramway, gare et pistes cyclables desservent le quartier. Les actualités et équipements sont suivis par la [page municipale du quartier](https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-notre-dame-saint-francois).",
    typicalHomes: "L’offre mêle logements dans les immeubles anciens autour des bassins, appartements de la Reconstruction et résidences plus récentes comme la tour Alta. Petites et moyennes surfaces côtoient des appartements familiaux. Pour un achat, examiner l’état de la copropriété, l’exposition, le stationnement et les contraintes de rénovation dans le centre patrimonial.",
    nearbyGuideIds: ["saint-francois", "centre-ville", "perrey", "la-plage"], placeType: "quartier",
  }),
  additionalGuide({
    id: "saint-francois", name: "Saint-François", pageTitle: "Immobilier dans le quartier Saint-François au Havre",
    heroImage: { src: "/images/geography/saint-francois.webp", alt: "Le bassin du Roy et le quartier Saint-François au Havre", credit: geographyPhotoCredits.saintFrancois },
    listingSearch: { city: "le-havre", query: "Saint-François" },
    subtitle: "Un quartier historique autour du bassin du Roy et des bassins du port", area: "Le Havre · presqu’île historique",
    link: { label: "Histoire, équipements et vie de quartier", href: "https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-notre-dame-saint-francois" },
    historyArchitecture: "Saint-François est l’un des plus anciens quartiers du Havre. À partir de 1541, le plan de Bellarmato organise ce secteur près du bassin du Roy ; les bassins de la Barre et du Commerce lui donnent ensuite son caractère insulaire. Une partie du tissu ancien et du tracé a été préservée à la Reconstruction. La Ville documente ce patrimoine sur sa [page Notre-Dame / Saint-François](https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-notre-dame-saint-francois).",
    schoolsServices: "Le quartier dispose notamment des écoles Percanville et Dauphine, d’une crèche et d’équipements de loisirs. Les services municipaux et établissements secondaires sont proches dans le centre-ville ; vérifiez les itinéraires scolaires selon l’adresse, notamment autour des bassins et des axes de circulation.",
    shopsLeisure: "Restaurants, cafés et commerces bordent les quais et les rues du quartier. Le marché aux poissons, le Musée de l’Armateur, le Port Center, la cathédrale Notre-Dame et les animations du bassin du Roy structurent les sorties et la vie locale.",
    projectsTransport: "Le marché aux poissons fait l’objet d’une rénovation progressive et les abords de la place du Père Arson ont été réaménagés pour les piétons. Bus LiA et tramway relient le quartier aux autres secteurs, à la gare et au littoral. Les projets à jour sont publiés par la [Ville du Havre](https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-notre-dame-saint-francois/notre-dame-saint-francois-en).",
    typicalHomes: "On trouve des appartements dans des immeubles de plusieurs époques, des logements familiaux autour des bassins et quelques maisons de ville. La forme des lots, la luminosité et le calme varient selon les rues et les vues sur les quais. Les biens anciens et les copropriétés exigent une lecture attentive des travaux, des charges et des protections patrimoniales.",
    nearbyGuideIds: ["notre-dame", "centre-ville", "perrey", "la-plage"], placeType: "quartier",
  }),
  additionalGuide({
    id: "perrey", reviewedAt: "2026-10-06", name: "Le Perrey", pageTitle: "Immobilier dans le quartier du Perrey au Havre",
    heroImage: { src: "/images/geography/perrey-perret-architecture.webp", alt: "Immeubles de l’architecture Perret au Havre, représentatifs du secteur Perrey-Perret", credit: geographyPhotoCredits.perrey, objectPosition: "center 46%" },
    listingSearch: { city: "le-havre", query: "Perrey" },
    subtitle: "Un secteur central entre la plage, l’hôtel de ville et le front de mer", area: "Le Havre · Perrey-Perret",
    link: { label: "Projets du quartier Perrey-Perret", href: "https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-perrey-perret/perrey-perret-en-mouvement" },
    historyArchitecture: "Le Perrey s’est urbanisé au XIXe siècle, avant d’être associé au centre reconstruit après 1944. Le secteur Perrey-Perret juxtapose immeubles de la Reconstruction, ensembles de l’atelier Perret, rues commerçantes et front de mer. Les immeubles sans affectation individuelle (ISAI) autour de l’hôtel de ville témoignent de cette histoire architecturale ; le centre reconstruit est inscrit au [patrimoine mondial de l’UNESCO](https://lehavre.fr/que-faire-au-havre/lh-culture/panorama/le-havre-patrimoine-mondial-de-lunesco).",
    schoolsServices: "Écoles et services du centre sont accessibles à pied ou en transports. L’hôtel de ville, le square Saint-Roch, les équipements sportifs du Grand Quai et les espaces culturels desservent les habitants du secteur ; la distance varie selon que l’on se trouve vers la plage ou vers les Gares.",
    shopsLeisure: "Le Grand Quai offre pelouses, aires de jeux, terrains de sport et promenade cyclable. Le square Saint-Roch, les commerces de l’avenue Foch et du centre, les Halles et la plage donnent au quartier une vie quotidienne animée. La [Ville du Havre détaille les équipements et projets Perrey-Perret](https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-perrey-perret).",
    projectsTransport: "La requalification du centre reconstruit concerne les espaces publics entre la place du Chillou, Saint-François et la rue de Paris. La Ville conduit aussi des reconversions de bâtiments en commerces, logements et bureaux, ainsi que la transformation de l’espace Graillot en centre d’art. Tram, bus LiA, gare et pistes cyclables sont proches ; consulter les [projets municipaux en cours](https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-perrey-perret/perrey-perret-en-mouvement).",
    typicalHomes: "Appartements dans les immeubles Perret et dans les résidences du XXe siècle, logements plus anciens côté front de mer et quelques maisons de ville composent l’offre. Les surfaces sont variées, du studio aux appartements familiaux. Ascenseur, balcon, lumière, stationnement et travaux de copropriété sont des critères déterminants.",
    nearbyGuideIds: ["centre-ville", "la-plage", "notre-dame", "saint-francois", "gobelins"], placeType: "quartier",
  }),
  additionalGuide({
    id: "danton", reviewedAt: "2026-10-06", name: "Danton", pageTitle: "Immobilier dans le quartier Danton au Havre",
    heroImage: { src: "/images/geography/danton-rue-jules-lecesne.webp", alt: "Immeuble résidentiel au 94 rue Jules-Lecesne, près du quartier Danton au Havre", credit: geographyPhotoCredits.danton, objectPosition: "center 44%" },
    listingSearch: { city: "le-havre", query: "Danton" },
    subtitle: "Équipements de quartier, places et squares dans le centre-ouest du Havre", area: "Le Havre · estimation MeilleursAgents « Anatole France / Danton »",
    link: { label: "Équipements et vie du quartier Danton : Ville du Havre", href: "https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-danton" },
    historyArchitecture: "Danton est un quartier du centre ancien du Havre, desservi par des rues commerçantes et des places de proximité. Le secteur a connu des opérations de renouvellement urbain autour du pôle Simone-Veil et des espaces publics voisins. La [Ville du Havre présente les projets et équipements du quartier](https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-danton).",
    schoolsServices: "Les équipements municipaux recensés par la Ville comprennent le relais lecture Simone Veil, la crèche Bouquet de Soleils et plusieurs écoles, dont Thionville, Raspail, des Douanes, République et Maréchal Joffre. L’affectation scolaire dépend de l’adresse ; confirmez-la auprès de la mairie.",
    shopsLeisure: "Le square Holker, le square Grosos et le parc Hauser apportent des espaces de détente. La piscine municipale du cours de la République, le Petit Théâtre et la salle Franklin complètent les équipements de quartier ; retrouvez les informations à jour sur la [page municipale de Danton](https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-danton).",
    projectsTransport: "Le pôle Simone-Veil concentre des services culturels et de proximité. Les projets d’espaces publics et les équipements évoluent par étapes ; vérifier les informations et calendriers publiés par la [Ville du Havre](https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-danton). Bus et tram desservent le centre ; les trajets varient selon la rue et l’arrêt choisi.",
    typicalHomes: "Le quartier associe appartements en immeubles urbains, logements de la Reconstruction et maisons de ville. Les rues et l’état du bâti créent des écarts importants : contrôler l’isolation, les charges, les travaux de copropriété, le stationnement et le bruit des axes voisins.",
    nearbyGuideIds: ["le-havre", "centre-ville", "halles-centrales", "hotel-de-ville", "saint-michel", "bleville"], placeType: "quartier",
  }),
  additionalGuide({
    id: "bleville", reviewedAt: "2026-10-01", name: "Bois de Bléville", pageTitle: "Immobilier au Bois de Bléville, au Havre",
    heroImage: { src: "/images/geography/bleville-home.webp", alt: "Maison individuelle photographiée rue du Maréchal-Lyautey, dans le quartier du Bois de Bléville au Havre", credit: geographyPhotoCredits.bleVille },
    listingSearch: { city: "le-havre", query: "Bléville" },
    subtitle: "Un quartier résidentiel des hauteurs nord du Havre, avec écoles et équipements de proximité", area: "Le Havre · quartier « Bleville » selon MeilleursAgents",
    link: { label: "Équipements et vie du quartier Bois de Bléville : Ville du Havre", href: "https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-bois-de-bleville" },
    historyArchitecture: "Le Bois de Bléville est un quartier municipal des secteurs nord-centre du Havre. Son paysage résidentiel réunit maisons et immeubles de différentes périodes. Consultez la [page officielle du quartier](https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-bois-de-bleville) pour ses actualités et les projets en cours.",
    schoolsServices: "La Ville recense notamment les écoles maternelle et élémentaire Jacques-Prévert, la crèche Coccinelle et le relais lecture Pierre Hamet. La Fabrique Pierre Hamet et la maison municipale du Bois au Coq accueillent également des services de proximité. Confirmez la sectorisation scolaire selon l’adresse auprès de la mairie.",
    shopsLeisure: "Le centre de loisirs Fabrique Pierre Hamet, la salle des fêtes du Bois de Bléville et le cimetière Nord figurent parmi les équipements municipaux. Les commerces et services se répartissent entre les rues résidentielles et les quartiers voisins ; les distances dépendent du point de départ.",
    projectsTransport: "La Ville publie les concertations et évolutions du quartier sur sa [page du Bois de Bléville](https://lehavre.fr/ma-ville/vie-des-quartiers/quartier-bois-de-bleville). Vérifiez les lignes de bus LiA, les horaires et les itinéraires piétons selon l’adresse ; les équipements du centre havrais nécessitent un déplacement vers le sud.",
    typicalHomes: "Maisons individuelles, pavillons et appartements composent le parc résidentiel. Pour chaque bien, vérifier le DPE, l’état de la toiture et des menuiseries, les travaux récents, le stationnement et l’accès aux transports et aux commerces.",
    nearbyGuideIds: ["le-havre", "saint-michel", "danton", "gainneville", "gonfreville-l-orcher"], placeType: "quartier",
  }),
  additionalGuide({
    id: "centre-ville", reviewedAt: "2026-10-06", name: "Le centre-ville", pageTitle: "Immobilier dans le centre-ville du Havre",
    heroImage: { src: "/images/geography/centre-ville-havre.webp", alt: "Vue aérienne du centre-ville reconstruit du Havre et de l’église Saint-Joseph", credit: geographyPhotoCredits.centreVille, objectPosition: "center 58%" },
    listingSearch: { city: "le-havre", query: "centre-ville" },
    subtitle: "Centre reconstruit, grands équipements, commerces et services accessibles à pied", area: "Le Havre · centre reconstruit",
    link: { label: "Patrimoine mondial et architecture Perret", href: "https://lehavre.fr/que-faire-au-havre/lh-culture/panorama/le-havre-patrimoine-mondial-de-lunesco" },
    historyArchitecture: "La destruction de 1944 a conduit à la reconstruction du centre sous la direction d’Auguste Perret. Le béton armé, les îlots réguliers et les perspectives urbaines donnent au quartier son identité ; plusieurs ensembles sont inscrits au [patrimoine mondial de l’UNESCO](https://lehavre.fr/que-faire-au-havre/lh-culture/panorama/le-havre-patrimoine-mondial-de-lunesco). Saint-François et Notre-Dame conservent des formes urbaines plus anciennes à proximité.",
    schoolsServices: "Le centre rassemble des établissements scolaires, l’[Hôtel de Ville](https://lehavre.fr/annuaire-equipements/hotel-de-ville), des services de santé et des équipements culturels. L’université et les écoles supérieures se rejoignent en tram, en bus ou à vélo. L’offre et la sectorisation scolaire sont à confirmer auprès de la Ville selon l’adresse exacte.",
    shopsLeisure: "[Les Halles centrales](https://lehavre.fr/services-au-quotidien/commerces-entreprises/les-marches-havrais), [l’Espace Coty](https://espace-coty.klepierre.fr/), les rues piétonnes et plusieurs marchés offrent une gamme complète de commerces. La bibliothèque Oscar Niemeyer, [le Volcan](https://www.levolcan.com/), le [MuMa](https://www.muma-lehavre.fr/), les cinémas, les squares et la plage se rejoignent facilement à pied ou en tram.",
    projectsTransport: "Le projet municipal de requalification des espaces publics couvre 10 hectares entre la place du Chillou, Saint-François et la rue de Paris, avec davantage de place pour les piétons, les vélos, la végétation et les quais ([informations et calendrier de la Ville](https://lehavre.fr/ma-ville/le-havre-ville-en-mouvement/requalification-des-espaces-publics-du-centre-reconstruit)). Tram A/B, funiculaire, bus LiA, gare et réseau cyclable offrent plusieurs options de déplacement.",
    typicalHomes: "La majorité de l’offre se compose d’appartements : immeubles de la Reconstruction, résidences récentes et quelques bâtiments plus anciens près des bassins. Studios et petites surfaces côtoient des appartements familiaux. Examiner la performance énergétique, les charges, les travaux votés, l’ascenseur, le stationnement et les règles patrimoniales.",
    nearbyGuideIds: ["halles-centrales", "hotel-de-ville", "notre-dame", "saint-francois", "perrey", "saint-michel", "gobelins"], placeType: "quartier",
  }),
  additionalGuide({
    id: "harfleur", name: "Harfleur", pageTitle: "Immobilier à Harfleur",
    heroImage: { src: "/images/geography/harfleur-quai-lezarde.webp", alt: "L’église Saint-Martin et les maisons anciennes au bord de la Lézarde à Harfleur", credit: geographyPhotoCredits.harfleur, objectPosition: "center 8%" },
    listingSearch: { query: "Harfleur" }, subtitle: "Une ville ancienne à l’est du Havre, entre centre historique et vallée de la Lézarde", area: "Seine-Maritime · Le Havre Seine Métropole",
    link: { label: "Informations communales et services", href: lhsmTown("harfleur") },
    historyArchitecture: "Harfleur est une ancienne ville portuaire de l’estuaire, façonnée par son port médiéval et le cours de la Lézarde. L’église Saint-Martin, les ruelles du centre ancien et les maisons de bourg côtoient des quartiers résidentiels plus récents. La communauté urbaine présente les [repères communaux et les contacts de la mairie](https://www.lehavreseinemetropole.fr/annuaire-des-communes/harfleur).",
    schoolsServices: "Harfleur dispose de plusieurs écoles, d’équipements sportifs et de services municipaux. Pour le collège ou le lycée, les familles bénéficient des établissements de l’agglomération ; la sectorisation et les horaires de transport scolaire sont à vérifier auprès de la commune.",
    shopsLeisure: "Le centre conserve commerces, marché et services de proximité. Les berges de la Lézarde, les équipements associatifs et le patrimoine du centre ancien offrent des sorties locales ; les grands commerces et équipements du Havre sont accessibles à courte distance.",
    projectsTransport: "La future ligne C du tramway doit relier Harfleur au Havre, Montivilliers et aux quartiers sud à partir de 2027 ; le tracé traverse le centre et améliore les correspondances avec l’hôpital Jacques-Monod. Bus LiA et axes routiers complètent l’offre actuelle. Suivre l’avancement sur le [site de la métropole](https://www.lehavreseinemetropole.fr/).",
    typicalHomes: "Maisons de bourg, maisons mitoyennes, pavillons familiaux et appartements de résidence sont représentés. Les biens anciens du centre peuvent offrir du caractère mais demander des travaux ; les logements plus récents disposent plus souvent d’un jardin ou d’un stationnement. Comparer le quartier, l’accès aux transports et l’état de la parcelle.",
    nearbyGuideIds: ["gonfreville-l-orcher", "gainneville", "montivilliers", "le-havre"], placeType: "commune",
  }),
  additionalGuide({
    id: "gonfreville-l-orcher", reviewedAt: "2026-10-06", name: "Gonfreville-l’Orcher", pageTitle: "Immobilier à Gonfreville-l’Orcher",
    heroImage: { src: "/images/geography/gonfreville-chateau-orcher.webp", alt: "Le château d’Orcher, monument dominant la vallée de la Seine à Gonfreville-l’Orcher", credit: geographyPhotoCredits.gonfreville, objectPosition: "center 30%" }, listingSearch: { query: "Gonfreville-l'Orcher" },
    subtitle: "Commune aux paysages contrastés, entre quartiers résidentiels et activités portuaires", area: "Seine-Maritime · Le Havre Seine Métropole",
    link: { label: "Mairie et informations sur la commune", href: "https://www.gonfreville-l-orcher.fr/" },
    historyArchitecture: "La commune s’organise entre le bourg, les secteurs résidentiels et les paysages industriels du sud de l’estuaire. Le nom d’Orcher rappelle un patrimoine seigneurial ancien ; le château d’Orcher domine la vallée de la Seine à proximité. Pour les équipements et l’histoire locale, consulter la [mairie de Gonfreville-l’Orcher](https://www.gonfreville-l-orcher.fr/).",
    schoolsServices: "Écoles, équipements sportifs, services municipaux et structures associatives couvrent les besoins courants. L’offre de soins, les commerces et les établissements du Havre complètent les services locaux. Les secteurs scolaires varient avec l’adresse et se confirment en mairie.",
    shopsLeisure: "Les commerces du centre et des quartiers résidentiels sont complétés par de grands pôles commerciaux proches. Parcs, équipements sportifs et vie associative structurent les loisirs ; la proximité de l’estuaire apporte aussi un paysage de nature et d’activités portuaires.",
    projectsTransport: "La commune est desservie par les bus LiA et les axes vers Le Havre, Harfleur et Saint-Romain. La future ligne C doit desservir le pôle de l’hôpital Jacques-Monod et améliorer les correspondances à l’échelle de l’agglomération en 2027. Les [informations de transport LiA](https://www.transports-lia.fr/) permettent de vérifier les lignes et horaires actuels.",
    typicalHomes: "L’offre associe appartements collectifs dans certains quartiers, maisons de ville et pavillons avec jardin. Les secteurs sont contrastés : examiner l’environnement immédiat, les nuisances, les accès, le stationnement et les diagnostics du bien. Les prix moyens de commune ne remplacent pas une estimation à l’adresse.",
    nearbyGuideIds: ["harfleur", "rogerville", "gainneville", "saint-romain"], placeType: "commune",
  }),
  additionalGuide({
    id: "rogerville", reviewedAt: "2026-10-06", name: "Rogerville", pageTitle: "Immobilier à Rogerville",
    heroImage: { src: "/images/geography/rogerville-eglise.webp", alt: "L’église de Rogerville et son clocher, repère du bourg", credit: geographyPhotoCredits.rogerville, objectPosition: "center 12%" }, listingSearch: { query: "Rogerville" },
    subtitle: "Une commune entre le Havre, l’aéroport et les paysages de l’estuaire", area: "Seine-Maritime · Le Havre Seine Métropole",
    link: { label: "Fiche officielle de la commune", href: lhsmTown("rogerville") },
    historyArchitecture: "Rogerville est une commune de l’estuaire dans laquelle le bourg et les hameaux s’inscrivent dans un paysage de plateau rural, à proximité du port et des zones d’activités. Le bâti mêle maisons normandes, fermes et constructions résidentielles récentes. La [fiche de la commune par Le Havre Seine Métropole](https://www.lehavreseinemetropole.fr/annuaire-des-communes/rogerville) donne accès aux coordonnées et informations municipales.",
    schoolsServices: "La mairie et les services communaux répondent aux démarches de proximité. Les écoles et services du quotidien sont à vérifier selon le niveau recherché ; les communes proches et Le Havre complètent l’offre de commerces, de soins et d’établissements secondaires.",
    shopsLeisure: "Le cadre est résidentiel et rural, avec des équipements locaux et des promenades dans l’arrière-pays. Les commerces plus nombreux de Gonfreville-l’Orcher et du Havre restent proches en voiture ou en bus selon l’adresse.",
    projectsTransport: "Les bus LiA et les axes routiers relient Rogerville au Havre, à Gonfreville-l’Orcher et à Saint-Romain. Les activités portuaires, les accès aux zones industrielles et l’aéroport structurent les déplacements. Vérifier les horaires de bus et le temps de trajet aux heures de pointe avec le [réseau LiA](https://www.transports-lia.fr/).",
    typicalHomes: "Maisons individuelles avec jardin et propriétés dans les hameaux dominent ; l’offre d’appartements est réduite. Les parcelles, dépendances et annexes jouent souvent un rôle majeur dans le prix. Contrôler l’assainissement, l’accès, les servitudes et l’environnement autour des zones d’activité.",
    nearbyGuideIds: ["gonfreville-l-orcher", "gainneville", "saint-romain", "la-cerlangue"], placeType: "commune",
  }),
  additionalGuide({
    id: "saint-laurent-de-brevedent", reviewedAt: "2026-10-06", name: "Saint-Laurent-de-Brèvedent", pageTitle: "Immobilier à Saint-Laurent-de-Brèvedent",
    heroImage: { src: "/images/geography/saint-laurent-brevedent.webp", alt: "Le centre-bourg de Saint-Laurent-de-Brèvedent et ses bâtiments municipaux", credit: geographyPhotoCredits.saintLaurent, objectPosition: "center 62%" }, listingSearch: { query: "Saint-Laurent-de-Brèvedent" },
    subtitle: "Un village résidentiel entre la vallée de la Lézarde et le pays de Caux", area: "Seine-Maritime · Le Havre Seine Métropole",
    link: { label: "Vie communale et contacts officiels", href: lhsmTown("saint-laurent-de-brevedent") },
    historyArchitecture: "La commune s’étend entre le plateau et la vallée de la Lézarde. Son bourg et ses hameaux gardent une échelle rurale, avec bâti ancien en brique, silex ou colombage et maisons plus récentes autour des axes. La mairie et la communauté urbaine publient les informations pratiques sur la [fiche officielle de la commune](https://www.lehavreseinemetropole.fr/annuaire-des-communes/saint-laurent-de-brevedent).",
    schoolsServices: "La vie communale s’appuie sur la mairie, les associations et les équipements de proximité. Selon le niveau scolaire et l’adresse, les familles se tournent aussi vers Saint-Romain-de-Colbosc, Gainneville ou Montivilliers ; les services de santé et commerces les plus étendus se trouvent dans les pôles voisins.",
    shopsLeisure: "Le village offre un cadre calme, des itinéraires de promenade dans la vallée et une vie associative de proximité. Les commerces quotidiens et le marché de Saint-Romain ou de Montivilliers sont accessibles en voiture ; vérifier les déplacements sans voiture selon le secteur habité.",
    projectsTransport: "Les routes locales rejoignent rapidement la vallée de la Lézarde, Montivilliers et Saint-Romain. Le réseau de bus interurbains dessert les pôles voisins, mais la fréquence est plus limitée qu’au Havre. Le pôle de Saint-Romain-de-Colbosc de la [Métropole accompagne les démarches d’urbanisme](https://www.lehavreseinemetropole.fr/amonservice/demarche/autorisations-durbanisme).",
    typicalHomes: "Pavillons, maisons de village, fermes rénovées et propriétés avec terrain dominent, avec peu d’appartements. Les tailles de parcelle, la pente, l’accès et l’assainissement individuel sont des points de visite importants.",
    nearbyGuideIds: ["montivilliers", "gainneville", "saint-romain", "etainhus"], placeType: "commune",
  }),
  additionalGuide({
    id: "etainhus", reviewedAt: "2026-10-06", name: "Étainhus", pageTitle: "Immobilier à Étainhus",
    heroImage: { src: "/images/geography/etainhus-eglise.webp", alt: "L’église Saint-Jacques et son clocher à Étainhus", credit: geographyPhotoCredits.etainhus, objectPosition: "center 10%" }, listingSearch: { query: "Étainhus" },
    subtitle: "Une commune du pays de Caux dotée d’une gare sur la ligne Le Havre–Fécamp", area: "Seine-Maritime · Le Havre Seine Métropole",
    link: { label: "Informations communales et site de la mairie", href: lhsmTown("etainhus") },
    historyArchitecture: "Le nom d’Étainhus est attesté dès le XIIe siècle et pourrait évoquer une « maison de pierre ». L’église Saint-Jacques, dont le chœur remonte au XIIe siècle, constitue un repère du bourg. Des maisons traditionnelles, longères et pavillons plus récents s’égrènent dans un paysage rural. La [fiche de la Métropole](https://www.lehavreseinemetropole.fr/annuaire-des-communes/etainhus) renvoie aussi au site de la mairie.",
    schoolsServices: "La commune propose des services de proximité ; les établissements et la sectorisation scolaire sont à vérifier auprès de la mairie. Saint-Romain-de-Colbosc et les autres bourgs voisins offrent des commerces, des soins et des équipements plus étendus.",
    shopsLeisure: "Le bourg et les hameaux offrent un cadre calme, des chemins de campagne et une vie associative locale. Pour les courses et les services spécialisés, les habitants rejoignent notamment Saint-Romain ou les pôles de l’agglomération.",
    projectsTransport: "La gare Étainhus–Saint-Romain se trouve sur la ligne ferroviaire Le Havre–Fécamp et permet de rejoindre les gares du secteur ; vérifier les horaires auprès de [SNCF TER Normandie](https://www.ter.sncf.com/normandie). Les routes départementales assurent le lien avec le bourg-centre et l’A29.",
    typicalHomes: "Les maisons individuelles, pavillons et anciennes fermes avec jardin constituent l’essentiel de l’offre ; les appartements sont rares. Une gare à proximité peut convenir à un trajet ferroviaire régulier, sous réserve de vérifier la distance réelle depuis le logement. Examiner rénovation, toiture, isolation et assainissement.",
    nearbyGuideIds: ["epretot", "saint-romain", "saint-aubin-routot", "saint-laurent-de-brevedent"], placeType: "commune",
  }),
  additionalGuide({
    id: "epretot", reviewedAt: "2026-10-06", name: "Épretot", pageTitle: "Immobilier à Épretot",
    heroImage: { src: "/images/geography/epretot-eglise.webp", alt: "L’église Saint-Pierre et le paysage rural d’Épretot", credit: geographyPhotoCredits.epretot, objectPosition: "center 20%" }, listingSearch: { query: "Épretot" },
    subtitle: "Un village cauchois entre Le Havre et Saint-Romain-de-Colbosc", area: "Seine-Maritime · Le Havre Seine Métropole",
    link: { label: "Histoire et informations de la mairie", href: lhsmTown("epretot") },
    historyArchitecture: "Épretot est mentionné sous la forme « Espretot » dans une charte de 1114. L’église Saint-Pierre, des XIIe et XVIe siècles, et plusieurs colombiers rappellent l’histoire du village et des fermes du pays de Caux. Pour les informations locales et les éléments patrimoniaux, voir la [fiche communale de la Métropole](https://www.lehavreseinemetropole.fr/annuaire-des-communes/epretot).",
    schoolsServices: "La mairie et les services communaux sont au cœur du village. Écoles et commerces ne forment pas un pôle aussi dense qu’à Saint-Romain ; vérifier la commune de scolarisation, les horaires de transport et les services accessibles depuis le logement avant un achat familial.",
    shopsLeisure: "Le cadre est rural, avec chemins de promenade et activité agricole. Pour le marché, les courses et les équipements sportifs, les bourgs voisins — notamment Saint-Romain-de-Colbosc — élargissent l’offre. Une voiture reste pratique pour les déplacements quotidiens selon l’adresse.",
    projectsTransport: "Les routes départementales relient Épretot à Étainhus, Saint-Romain et l’A29. Les cars régionaux NOMAD et les gares des communes voisines sont à vérifier selon les horaires de déplacement. Les demandes de permis et certificats d’urbanisme relèvent du pôle de Saint-Romain de la [Métropole](https://www.lehavreseinemetropole.fr/amonservice/demarche/autorisations-durbanisme).",
    typicalHomes: "Maisons de village, pavillons, corps de ferme et maisons avec jardin ou dépendances dominent ; l’offre d’appartements est très limitée. La surface habitable n’explique pas seule le prix : terrain, bâtiments annexes, état de la toiture et assainissement individuel comptent beaucoup.",
    nearbyGuideIds: ["etainhus", "saint-romain", "saint-aubin-routot", "la-remuee"], placeType: "commune",
  }),
  additionalGuide({
    id: "saint-aubin-routot", reviewedAt: "2026-10-06", name: "Saint-Aubin-Routot", pageTitle: "Immobilier à Saint-Aubin-Routot",
    heroImage: { src: "/images/geography/saint-aubin-routot-eglise.webp", alt: "L’église de Saint-Aubin-Routot dans le bourg à la tombée du jour", credit: geographyPhotoCredits.saintAubinRoutot, objectPosition: "center 18%" }, listingSearch: { query: "Saint-Aubin-Routot" },
    subtitle: "Une commune rurale à l’est de l’agglomération havraise", area: "Seine-Maritime · Le Havre Seine Métropole",
    link: { label: "Mairie et informations communales", href: lhsmTown("saint-aubin-routot") },
    historyArchitecture: "Saint-Aubin-Routot regroupe bourg et hameaux dans un paysage agricole du pays de Caux. L’église et les bâtiments communaux forment des repères autour du centre ; le bâti résidentiel comprend maisons de bourg, fermes et pavillons. La [fiche officielle de la Métropole](https://www.lehavreseinemetropole.fr/annuaire-des-communes/saint-aubin-routot) centralise les coordonnées de la mairie.",
    schoolsServices: "Les services de mairie et équipements communaux répondent aux besoins de proximité. L’offre scolaire, les regroupements éventuels et les transports scolaires sont à confirmer avec la commune ; Saint-Romain-de-Colbosc et les bourgs voisins complètent les services médicaux et les commerces.",
    shopsLeisure: "Le quotidien s’organise autour du village, des activités associatives et des chemins ruraux. Les commerces et marchés les plus complets se trouvent dans les centres voisins. La voiture facilite les trajets vers Le Havre, Saint-Romain et les zones d’emploi de l’estuaire.",
    projectsTransport: "Saint-Aubin-Routot relève du pôle d’instruction d’urbanisme de Saint-Romain-de-Colbosc ; les démarches et rendez-vous sont indiqués par [Le Havre Seine Métropole](https://www.lehavreseinemetropole.fr/amonservice/demarche/autorisations-durbanisme). L’accès repose surtout sur les routes locales et les lignes d’autocar interurbain à horaires à vérifier.",
    typicalHomes: "Maisons individuelles, pavillons avec jardin, maisons de bourg et anciennes fermes forment la majorité du parc. Les appartements sont rares. Avant achat, vérifier l’assainissement, les annexes, le voisinage agricole, les temps de trajet et le coût de rénovation des bâtiments anciens.",
    nearbyGuideIds: ["epretot", "etainhus", "la-remuee", "saint-romain"], placeType: "commune",
  }),
  additionalGuide({
    id: "la-remuee", name: "La Remuée", pageTitle: "Immobilier à La Remuée",
    heroImage: { src: "/images/geography/la-remuee-mairie.webp", alt: "La mairie-école en brique de La Remuée", credit: geographyPhotoCredits.laRemuee, objectPosition: "center 52%" }, listingSearch: { query: "La Remuée" },
    subtitle: "Un village du pays de Caux entre Le Havre et Saint-Romain-de-Colbosc", area: "Seine-Maritime · Le Havre Seine Métropole",
    link: { label: "Histoire et services de la commune", href: lhsmTown("la-remuee") },
    historyArchitecture: "La Remuée, anciennement Notre-Dame-sur-Seine, est mentionnée à partir du XIIe siècle. Le village s’est développé le long de l’ancienne voie reliant Lillebonne à Harfleur. L’église du XVIIIe siècle et le château de Maréfosse, visible sur la route vers Saint-Romain, sont des repères du patrimoine local ; la [fiche de la Métropole](https://www.lehavreseinemetropole.fr/annuaire-des-communes/la-remuee) présente les services municipaux.",
    schoolsServices: "La commune dispose de services municipaux et d’une vie associative locale. Les parcours scolaires, établissements du secondaire et services de santé se répartissent avec les bourgs voisins ; confirmer les inscriptions et trajets auprès de la mairie selon le niveau de classe.",
    shopsLeisure: "Le village propose un environnement calme, des chemins ruraux et des espaces de promenade. Saint-Romain-de-Colbosc et Bolbec apportent davantage de commerces, de marchés, de restaurants et d’équipements. Les distances et horaires de transport varient selon le hameau.",
    projectsTransport: "Les axes routiers relient La Remuée à Saint-Romain, Bolbec et l’A29 ; les cars NOMAD sont à consulter pour les trajets sans voiture. Les autorisations de travaux sont instruites par le pôle de Saint-Romain de la communauté urbaine [Le Havre Seine Métropole](https://www.lehavreseinemetropole.fr/amonservice/demarche/autorisations-durbanisme).",
    typicalHomes: "Maisons individuelles, pavillons, maisons de bourg, fermes et propriétés avec dépendances composent l’essentiel du marché. Il y a peu d’appartements. Examiner l’état des toitures, les bâtiments annexes, le terrain, l’assainissement et la distance réelle aux services.",
    nearbyGuideIds: ["saint-aubin-routot", "epretot", "saint-romain", "gommerville"], placeType: "commune",
  }),
  additionalGuide({
    id: "gommerville", reviewedAt: "2026-10-06", name: "Gommerville", pageTitle: "Immobilier à Gommerville",
    heroImage: { src: "/images/geography/gommerville-chateau-filieres.webp", alt: "Le château de Filières, situé sur la commune de Gommerville", credit: geographyPhotoCredits.gommerville, objectPosition: "center 42%" }, listingSearch: { query: "Gommerville" },
    subtitle: "Une petite commune rurale à proximité du pôle de Saint-Romain-de-Colbosc", area: "Seine-Maritime · Le Havre Seine Métropole",
    link: { label: "Fiche officielle de la commune", href: lhsmTown("gommerville") },
    historyArchitecture: "Gommerville est une petite commune agricole du pays de Caux, organisée en bourg et hameaux. Le bâti mêle maisons de village, anciennes fermes et pavillons, avec des matériaux normands comme la brique, le silex et le colombage. Les informations de mairie et les repères communaux sont rassemblés sur la [fiche de la communauté urbaine Le Havre Seine Métropole](https://www.lehavreseinemetropole.fr/annuaire-des-communes/gommerville).",
    schoolsServices: "Les équipements et services sont ceux d’une commune de petite taille ; vérifier la carte scolaire, les transports et les services disponibles auprès de la mairie. Saint-Romain-de-Colbosc, tout proche, offre une gamme plus large d’établissements, de professionnels de santé et de commerces.",
    shopsLeisure: "Les promenades rurales, associations et activités agricoles donnent le ton local. Pour les achats courants, le marché, les restaurants et les équipements sportifs, les habitants se rendent principalement à Saint-Romain ou dans les communes voisines.",
    projectsTransport: "Le pôle de Saint-Romain-de-Colbosc instruit les demandes d’urbanisme de Gommerville ; la procédure est décrite par [la Métropole](https://www.lehavreseinemetropole.fr/amonservice/demarche/autorisations-durbanisme). Routes départementales et cars interurbains relient les bourgs ; vérifier les horaires avant de compter sur les transports collectifs au quotidien.",
    typicalHomes: "Maisons de bourg, pavillons, fermes et propriétés avec terrain dominent, avec peu ou pas d’appartements disponibles. Terrain, dépendances, état de rénovation et assainissement individuel ont un poids important dans le prix. Les repères communaux reposent sur un petit nombre de transactions.",
    nearbyGuideIds: ["la-remuee", "saint-romain", "la-cerlangue", "les-trois-pierres"], placeType: "commune",
  }),
  additionalGuide({
    id: "la-cerlangue", reviewedAt: "2026-10-06", name: "La Cerlangue", pageTitle: "Immobilier à La Cerlangue",
    heroImage: { src: "/images/geography/la-cerlangue-eglise.webp", alt: "L’église Saint-Jean-d’Abbetot à La Cerlangue", credit: geographyPhotoCredits.laCerlangue, objectPosition: "center 10%" }, listingSearch: { query: "La Cerlangue" },
    subtitle: "Une vaste commune rurale entre le pays de Caux et l’estuaire de la Seine", area: "Seine-Maritime · Le Havre Seine Métropole",
    link: { label: "Commune et démarches locales", href: lhsmTown("la-cerlangue") },
    historyArchitecture: "La Cerlangue est une commune étendue composée de hameaux et de paysages ruraux à la transition du pays de Caux et de l’estuaire. Les bâtiments anciens, fermes et maisons normandes se répartissent loin d’un centre unique. La [Métropole présente la commune et ses contacts officiels](https://www.lehavreseinemetropole.fr/annuaire-des-communes/la-cerlangue).",
    schoolsServices: "Les services communaux sont à repérer selon le hameau. Écoles et services intercommunaux se partagent avec Saint-Romain-de-Colbosc, La Remuée et les communes voisines ; vérifier les trajets scolaires, les soins et les commerces accessibles depuis chaque bien.",
    shopsLeisure: "Les chemins, espaces agricoles et paysages ouverts favorisent une vie tournée vers la campagne. Les courses, marchés, commerces et équipements sportifs se trouvent surtout dans les bourgs voisins. La localisation précise du logement compte pour le temps d’accès à ces services.",
    projectsTransport: "La Cerlangue est rattachée au pôle de Saint-Romain pour les demandes d’urbanisme ([démarches de la Métropole](https://www.lehavreseinemetropole.fr/amonservice/demarche/autorisations-durbanisme)). L’accès est principalement routier ; les lignes NOMAD et les correspondances sont à contrôler selon le jour et l’heure.",
    typicalHomes: "Maisons anciennes, corps de ferme, pavillons isolés et propriétés avec dépendances forment le parc le plus courant. Les appartements sont exceptionnels. Contrôler l’état du bâti ancien, les installations d’assainissement, les servitudes agricoles et les kilomètres quotidiens vers les services.",
    nearbyGuideIds: ["gommerville", "la-remuee", "rogerville", "saint-romain"], placeType: "commune",
  }),
  additionalGuide({
    id: "les-trois-pierres", reviewedAt: "2026-10-06", name: "Les Trois-Pierres", pageTitle: "Immobilier aux Trois-Pierres",
    heroImage: { src: "/images/geography/les-trois-pierres-mairie.webp", alt: "La mairie en brique des Trois-Pierres", credit: geographyPhotoCredits.lesTroisPierres, objectPosition: "center 42%" }, listingSearch: { query: "Les Trois-Pierres" },
    subtitle: "Un village du pays de Caux entre Saint-Romain-de-Colbosc et Bolbec", area: "Seine-Maritime · Le Havre Seine Métropole",
    link: { label: "Histoire et coordonnées de la mairie", href: lhsmTown("les-trois-pierres") },
    historyArchitecture: "Le nom « Tribus Petris » apparaît en 1222 ; il évoquerait trois blocs de pierre autrefois présents dans le cimetière. Le village conserve une échelle agricole et des maisons de pays, avec des fermes et pavillons autour du bourg. La [fiche de la Métropole](https://www.lehavreseinemetropole.fr/annuaire-des-communes/les-trois-pierres) décrit son histoire et ses services.",
    schoolsServices: "La mairie et les équipements de proximité desservent un village de taille modeste. Pour les établissements scolaires, soins et services plus spécialisés, Saint-Romain-de-Colbosc et Bolbec constituent les pôles voisins ; confirmer la carte scolaire et les transports en mairie.",
    shopsLeisure: "La campagne, les associations et les producteurs locaux animent la vie quotidienne. Une cueillette locale et des exploitations agricoles sont présentes sur le territoire ; marchés, commerces et équipements sont plus nombreux à Saint-Romain ou Bolbec.",
    projectsTransport: "Les routes locales relient la commune à Saint-Romain et Bolbec ; les cars régionaux NOMAD desservent l’axe selon les horaires publiés. Les demandes d’urbanisme relèvent du pôle de Saint-Romain de la communauté urbaine [Le Havre Seine Métropole](https://www.lehavreseinemetropole.fr/amonservice/demarche/autorisations-durbanisme).",
    typicalHomes: "Maisons individuelles, pavillons, fermes rénovées et maisons avec jardin ou dépendances constituent l’essentiel de l’offre. Les appartements sont rares. La rénovation, les annexes, la toiture, la superficie du terrain et l’accès aux réseaux influencent fortement chaque bien.",
    nearbyGuideIds: ["gommerville", "saint-romain", "la-remuee", "epretot"], placeType: "commune",
  }),
];

geographyGuides.push(...additionalGeographyGuides);
