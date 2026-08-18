/* =========================================
   WENDKOUNI SAVONNERIE
   V3 - SUPABASE
========================================= */


/* CLIENT SUPABASE */

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* VARIABLES */

let produits = [];

let panier =
    JSON.parse(
        localStorage.getItem("wendkouni_panier")
    ) || [];

let categorieActuelle = "Tous";


/* =========================================
   CHARGER LES PRODUITS
========================================= */

async function chargerProduits() {

    const container =
        document.getElementById("products");

    container.innerHTML = `
        <p style="grid-column:1/-1;text-align:center;">
            Chargement des produits...
        </p>
    `;


    const { data, error } =
        await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", {
            ascending: false
        });
    
    if (error) {

        console.error(error);

        container.innerHTML = `
            <p style="grid-column:1/-1;text-align:center;">
                Impossible de charger les produits.
            </p>
        `;

        return;
    }


    produits = data || [];

console.log("PRODUITS RECUS PAR LE SITE :", produits);
console.log("NOMBRE DE PRODUITS :", produits.length);

    afficherCategories();

    afficherProduits(produits);

    afficherPanier();
}


/* =========================================
   AFFICHER PRODUITS
========================================= */

function afficherProduits(liste) {

    const container =
        document.getElementById("products");

    container.innerHTML = "";


    if (!liste.length) {

        container.innerHTML = `
            <p style="grid-column:1/-1;text-align:center;">
                Aucun produit disponible.
            </p>
        `;

        return;
    }


    liste.forEach(produit => {

        let imageHTML = "🧼";


        if (produit.image_url) {

            imageHTML = `
                <img
                    src="${produit.image_url}"
                    alt="${produit.name}">
            `;

        }


        const stockClass =
            produit.stock > 0
            ? "ok"
            : "empty";


        const stockText =
            produit.stock > 0
            ? `Disponible : ${produit.stock}`
            : "Rupture de stock";


        container.innerHTML += `

            <article class="product-card">

                <div class="product-image">
                    ${imageHTML}
                </div>

                <div class="product-info">

                    <h3>
                        ${produit.name}
                    </h3>

                    <p class="description">
                        ${produit.description || ""}
                    </p>

                    <div class="price">
                        ${Number(produit.price)
                            .toLocaleString()} FCFA
                    </div>

                    <div class="stock ${stockClass}">
                        ${stockText}
                    </div>

                    <div class="product-actions">

                        <button
                            class="details-button"
                            onclick="voirProduit(${produit.id})">

                            Voir

                        </button>

                        <button
                            class="add-button"
                            onclick="ajouterAuPanier(${produit.id})"
                            ${produit.stock <= 0 ? "disabled" : ""}>

                            🛒 Ajouter

                        </button>

                    </div>

                </div>

            </article>

        `;

    });

}


/* =========================================
   CATÉGORIES
========================================= */

function afficherCategories() {

    const container =
        document.getElementById("categories");

    const categories = [
        "Tous",
        ...new Set(
            produits.map(
                produit => produit.category
            )
        )
    ];


    container.innerHTML = "";


    categories.forEach(categorie => {

        container.innerHTML += `

            <button
                class="${
                    categorie === categorieActuelle
                    ? "active"
                    : ""
                }"
                onclick="filtrerProduits('${categorie}')">

                ${categorie}

            </button>

        `;

    });

}


/* =========================================
   FILTRE
========================================= */

function filtrerProduits(categorie) {

    categorieActuelle = categorie;

    rechercherProduit();

    afficherCategories();
}


/* =========================================
   RECHERCHE
========================================= */

function rechercherProduit() {

    const recherche =
        document.getElementById("search")
        .value
        .toLowerCase()
        .trim();


    let resultat = produits;


    if (categorieActuelle !== "Tous") {

        resultat =
            resultat.filter(
                produit =>
                    produit.category === categorieActuelle
            );

    }


    if (recherche) {

        resultat =
            resultat.filter(produit =>

                produit.name
                    .toLowerCase()
                    .includes(recherche)

                ||

                (produit.description || "")
                    .toLowerCase()
                    .includes(recherche)

            );

    }


    afficherProduits(resultat);
}


/* =========================================
   FICHE PRODUIT
========================================= */

function voirProduit(id) {

    const produit =
        produits.find(
            produit => produit.id === id
        );


    if (!produit) return;


    const image =
        produit.image_url
        ? `<img src="${produit.image_url}"
                alt="${produit.name}">`
        : "🧼";


    document.getElementById(
        "product-detail"
    ).innerHTML = `

        <div class="detail-image">
            ${image}
        </div>

        <h2>
            ${produit.name}
        </h2>

        <div class="price">
            ${Number(produit.price)
                .toLocaleString()} FCFA
        </div>

        <p class="detail-description">
            ${produit.description || ""}
        </p>

        <p>
            <strong>Composition :</strong>
            ${produit.composition || "Non renseignée"}
        </p>

        <p>
            <strong>Poids / volume :</strong>
            ${produit.weight || "Non renseigné"}
        </p>

        <p style="margin:15px 0;">
            <strong>Stock :</strong>
            ${produit.stock}
        </p>

        <button
            class="order-button"
            onclick="
                ajouterAuPanier(${produit.id});
                fermerProduit();
            ">

            🛒 Ajouter au panier

        </button>

    `;


    document.getElementById(
        "product-modal"
    ).style.display = "flex";
}


function fermerProduit() {

    document.getElementById(
        "product-modal"
    ).style.display = "none";
}


/* =========================================
   PANIER
========================================= */

function ajouterAuPanier(id) {

    const produit =
        produits.find(
            produit => produit.id === id
        );


    if (!produit || produit.stock <= 0) {

        alert("Produit indisponible.");

        return;
    }


    const article =
        panier.find(
            article => article.id === id
        );


    if (article) {

        if (
            article.quantite >= produit.stock
        ) {

            alert(
                "La quantité maximale disponible est atteinte."
            );

            return;
        }


        article.quantite++;

    } else {

        panier.push({
            id: id,
            quantite: 1
        });

    }


    sauvegarderPanier();

    afficherPanier();
}


/* =========================================
   PANIER
========================================= */

function afficherPanier() {

    const container =
        document.getElementById("cart-items");

    container.innerHTML = "";


    let total = 0;

    let nombre = 0;


    panier.forEach(article => {

        const produit =
            produits.find(
                produit =>
                    produit.id === article.id
            );


        if (!produit) return;


        const sousTotal =
            Number(produit.price)
            * article.quantite;


        total += sousTotal;

        nombre += article.quantite;


        container.innerHTML += `

            <div class="cart-item">

                <div>

                    <strong>
                        ${produit.name}
                    </strong>

                    <p>
                        ${Number(produit.price)
                            .toLocaleString()}
                        FCFA
                    </p>

                </div>

                <div class="quantity">

                    <button
                        onclick="
                            modifierQuantite(
                                ${produit.id},
                                -1
                            )
                        ">

                        −

                    </button>

                    <span>
                        ${article.quantite}
                    </span>

                    <button
                        onclick="
                            modifierQuantite(
                                ${produit.id},
                                1
                            )
                        ">

                        +

                    </button>

                </div>

            </div>
        `;

    });


    document.getElementById(
        "cart-total"
    ).textContent =
        total.toLocaleString() + " FCFA";


    document.getElementById(
        "cart-count"
    ).textContent = nombre;
}


/* =========================================
   QUANTITÉ
========================================= */

function modifierQuantite(
    id,
    changement
) {

    const article =
        panier.find(
            article => article.id === id
        );


    const produit =
        produits.find(
            produit => produit.id === id
        );


    if (!article || !produit)
        return;


    article.quantite += changement;


    if (article.quantite <= 0) {

        panier =
            panier.filter(
                article =>
                    article.id !== id
            );

    }


    if (
        article &&
        article.quantite > produit.stock
    ) {

        article.quantite =
            produit.stock;

    }


    sauvegarderPanier();

    afficherPanier();
}


/* =========================================
   OUVRIR / FERMER PANIER
========================================= */

function ouvrirPanier() {

    document.getElementById(
        "cart-overlay"
    ).style.display = "flex";
}


function fermerPanier() {

    document.getElementById(
        "cart-overlay"
    ).style.display = "none";
}


/* =========================================
   COMMANDE
========================================= */

function ouvrirCommande() {

    if (!panier.length) {

        alert(
            "Votre panier est vide."
        );

        return;
    }


    document.getElementById(
        "order-modal"
    ).style.display = "flex";
}


function fermerCommande() {

    document.getElementById(
        "order-modal"
    ).style.display = "none";
}


/* =========================================
   ENREGISTRER LA COMMANDE
========================================= */

async function envoyerCommande() {

    const nom =
        document.getElementById(
            "client-name"
        ).value.trim();


    const telephone =
        document.getElementById(
            "client-phone"
        ).value.trim();


    const adresse =
        document.getElementById(
            "client-address"
        ).value.trim();


    const livraison =
        document.getElementById(
            "delivery"
        ).value;


    if (
        !nom ||
        !telephone ||
        !adresse ||
        !livraison
    ) {

        alert(
            "Veuillez remplir tous les champs."
        );

        return;
    }


    let total = 0;


    panier.forEach(article => {

        const produit =
            produits.find(
                produit =>
                    produit.id === article.id
            );


        if (produit) {

            total +=
                Number(produit.price)
                * article.quantite;

        }

    });


    /* CRÉATION COMMANDE */

    const { data: commande, error } =
        await supabaseClient
        .from("orders")
        .insert({

            customer_name: nom,

            customer_phone: telephone,

            customer_address: adresse,

            delivery_method: livraison,

            total: total,

            status: "Nouvelle"

        })
        .select()
        .single();


    if (error) {

    console.error("ERREUR ORDERS :", error);

    alert(
        "ERREUR ORDERS : " +
        error.message
    );
    
        return;
    }


    /* DÉTAILS */

    const details =
        panier.map(article => {

            const produit =
                produits.find(
                    produit =>
                        produit.id === article.id
                );


            return {

                order_id: commande.id,

                product_id: produit.id,

                quantity: article.quantite,

                price: produit.price

            };

        });


    const { error: detailsError } =
        await supabaseClient
        .from("order_items")
        .insert(details);


    if (detailsError) {

        console.error(detailsError);

        alert(
            "La commande a été créée mais les détails n'ont pas pu être enregistrés."
        );

        return;
    }


/* =========================================
   WHATSAPP
========================================= */

let message =
    "Bonjour Wendkouni Savonnerie\n\n";

message +=
    "📦 *Nouvelle commande*\n\n";

message +=
    "👤 Nom : " +
    nom +
    "\n";

message +=
    "📞 Téléphone : " +
    telephone +
    "\n";

message +=
    "📍 Adresse : " +
    adresse +
    "\n";

message +=
    "🚚 Livraison : " +
    livraison +
    "\n\n";


panier.forEach(article => {

    const produit =
        produits.find(
            produit =>
                produit.id === article.id
        );

    if (!produit) return;

    const sousTotal =
        Number(produit.price) *
        article.quantite;

    message +=
        "• " +
        produit.name +
        " × " +
        article.quantite +
        " = " +
        sousTotal.toLocaleString() +
        " FCFA\n";
});


message +=
    "\n💰 *TOTAL : " +
    total.toLocaleString() +
    " FCFA*";


/* NUMÉRO WHATSAPP */

const numero = "22671386328";


/* LIEN WHATSAPP */

const url =
    "https://wa.me/" +
    numero +
    "?text=" +
    encodeURIComponent(message);


/* OUVERTURE */

window.location.href = url;
    /* NETTOYAGE */

    panier = [];

    sauvegarderPanier();

    afficherPanier();

    fermerCommande();

    fermerPanier();

}


/* =========================================
   SAUVEGARDER PANIER
========================================= */

function sauvegarderPanier() {

    localStorage.setItem(
        "wendkouni_panier",
        JSON.stringify(panier)
    );
}


/* =========================================
   DÉMARRAGE
========================================= */

chargerProduits();
