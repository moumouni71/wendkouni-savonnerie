/* =========================================
   WENDKOUNI SAVONNERIE
   ADMIN.JS — V3.2

   AUTHENTIFICATION + PRODUITS + IMAGES
========================================= */


/* =========================================
   1. INITIALISATION
========================================= */

console.log("=================================");
console.log("WENDKOUNI SAVONNERIE - ADMIN V3.2");
console.log("admin.js chargé");
console.log("=================================");


/* =========================================
   2. VERIFICATION CONFIGURATION
========================================= */

if (
    typeof SUPABASE_URL === "undefined" ||
    typeof SUPABASE_KEY === "undefined"
) {

    console.error(
        "SUPABASE_URL ou SUPABASE_KEY introuvable."
    );

    alert(
        "Erreur : config.js n'est pas correctement chargé."
    );

    throw new Error(
        "Configuration Supabase absente."
    );
}


console.log(
    "URL Supabase :",
    SUPABASE_URL
);


/* =========================================
   3. VERIFICATION SUPABASE
========================================= */

if (
    !window.supabase ||
    !window.supabase.createClient
) {

    console.error(
        "Bibliothèque Supabase non chargée."
    );

    alert(
        "Erreur : la bibliothèque Supabase n'est pas chargée."
    );

    throw new Error(
        "Supabase JS indisponible."
    );
}


/* =========================================
   4. CLIENT SUPABASE
========================================= */

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


console.log(
    "Client Supabase créé avec succès."
);


/* =========================================
   5. VARIABLES
========================================= */

let produits = [];

let categories = [];

let fichierImage = null;

let imageUrlActuelle = null;


/* =========================================
   6. ELEMENTS HTML
========================================= */

const loginPage =
    document.getElementById(
        "login-page"
    );


const dashboard =
    document.getElementById(
        "dashboard"
    );


const loginForm =
    document.getElementById(
        "login-form"
    );


const loginMessage =
    document.getElementById(
        "login-message"
    );


const logoutButton =
    document.getElementById(
        "logout-button"
    );


const adminEmail =
    document.getElementById(
        "admin-email"
    );


const productForm =
    document.getElementById(
        "product-form"
    );


const productImage =
    document.getElementById(
        "product-image"
    );


const imagePreview =
    document.getElementById(
        "image-preview"
    );


const cancelEditButton =
    document.getElementById(
        "cancel-edit-button"
    );


const searchInput =
    document.getElementById(
        "admin-search"
    );


/* =========================================
   7. DIAGNOSTIC
========================================= */

function debug(message) {

    console.log(
        "[ADMIN V3.2]",
        message
    );

}


/* =========================================
   8. MESSAGE CONNEXION
========================================= */

function afficherMessage(
    message,
    erreur = true
) {

    if (!loginMessage)
        return;


    loginMessage.textContent =
        message;


    loginMessage.style.color =
        erreur
        ? "#c0392b"
        : "#368454";

}


/* =========================================
   9. AFFICHER CONNEXION
========================================= */

function afficherConnexion() {

    loginPage.style.display =
        "flex";


    dashboard.style.display =
        "none";


    debug(
        "Page de connexion affichée."
    );

}


/* =========================================
   10. AFFICHER DASHBOARD
========================================= */

function afficherDashboard(
    utilisateur
) {

    loginPage.style.display =
        "none";


    dashboard.style.display =
        "block";


    if (adminEmail) {

        adminEmail.textContent =
            utilisateur.email;

    }


    debug(
        "Dashboard administrateur affiché."
    );

}


/* =========================================
   11. VERIFIER ADMINISTRATEUR
========================================= */

async function verifierAdministrateur(
    utilisateur
) {

    debug(
        "Vérification du compte administrateur..."
    );


    const {
        data,
        error
    } =
        await supabaseClient
        .from("admins")
        .select("user_id")
        .eq(
            "user_id",
            utilisateur.id
        )
        .maybeSingle();


    if (error) {

        console.error(
            "Erreur table admins :",
            error
        );


        debug(
            "ERREUR TABLE ADMINS : " +
            error.message
        );


        throw error;

    }


    if (!data) {

        debug(
            "Utilisateur absent de la table admins."
        );


        return false;

    }


    debug(
        "Compte administrateur confirmé."
    );


    return true;

}


/* =========================================
   12. VERIFIER SESSION
========================================= */

async function verifierSession() {

    debug(
        "Vérification de la session..."
    );


    try {

        const {
            data,
            error
        } =
            await supabaseClient
            .auth
            .getSession();


        if (error) {

            console.error(
                "Erreur getSession :",
                error
            );


            afficherConnexion();

            return;

        }


        const session =
            data.session;


        if (!session) {

            debug(
                "Aucune session active."
            );


            afficherConnexion();

            return;

        }


        debug(
            "Session trouvée."
        );


        debug(
            "Utilisateur : " +
            session.user.email
        );


        const estAdmin =
            await verifierAdministrateur(
                session.user
            );


        if (!estAdmin) {

            await supabaseClient
                .auth
                .signOut();


            afficherConnexion();


            afficherMessage(
                "Ce compte n'est pas administrateur."
            );


            return;

        }


        afficherDashboard(
            session.user
        );


        await initialiserDashboard();

    }

    catch (error) {

        console.error(
            "Erreur verifierSession :",
            error
        );


        afficherConnexion();


        afficherMessage(
            "Impossible de vérifier la session."
        );

    }

}


/* =========================================
   13. CONNEXION
========================================= */

loginForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        console.log(
            "FORMULAIRE DE CONNEXION DÉTECTÉ"
        );


        const email =
            document
            .getElementById(
                "email"
            )
            .value
            .trim();


        const password =
            document
            .getElementById(
                "password"
            )
            .value;


        if (
            !email ||
            !password
        ) {

            afficherMessage(
                "Veuillez saisir votre e-mail et votre mot de passe."
            );

            return;

        }


        const bouton =
            loginForm.querySelector(
                "button[type='submit']"
            );


        bouton.disabled =
            true;


        bouton.textContent =
            "Connexion...";


        afficherMessage(
            "Connexion en cours...",
            false
        );


        debug(
            "Tentative de connexion : " +
            email
        );


        try {

            const {
                data,
                error
            } =
                await supabaseClient
                .auth
                .signInWithPassword({

                    email: email,

                    password: password

                });


            if (error) {

                console.error(
                    "ERREUR SUPABASE LOGIN :",
                    error
                );


                debug(
                    "ERREUR LOGIN : " +
                    error.message
                );


                afficherMessage(
                    error.message
                );


                return;

            }


            if (!data.user) {

                afficherMessage(
                    "Connexion impossible."
                );


                return;

            }


            debug(
                "Authentification Supabase réussie."
            );


            debug(
                "Utilisateur : " +
                data.user.email
            );


            const estAdmin =
                await verifierAdministrateur(
                    data.user
                );


            if (!estAdmin) {

                await supabaseClient
                    .auth
                    .signOut();


                afficherConnexion();


                afficherMessage(
                    "Ce compte n'est pas administrateur."
                );


                return;

            }


            afficherMessage(
                "Connexion réussie.",
                false
            );


            afficherDashboard(
                data.user
            );


            await initialiserDashboard();

        }

        catch (error) {

            console.error(
                "Erreur connexion :",
                error
            );


            afficherConnexion();


            afficherMessage(
                "Erreur pendant la connexion."
            );

        }

        finally {

            bouton.disabled =
                false;


            bouton.textContent =
                "🔐 Se connecter";

        }

    }
);


/* =========================================
   14. DECONNEXION
========================================= */

logoutButton.addEventListener(
    "click",
    async function() {

        try {

            debug(
                "Déconnexion..."
            );


            const {
                error
            } =
                await supabaseClient
                .auth
                .signOut();


            if (error) {

                throw error;

            }


            debug(
                "Déconnexion réussie."
            );


            afficherConnexion();


            afficherMessage(
                "Vous êtes déconnecté.",
                false
            );

        }

        catch (error) {

            console.error(
                "Erreur déconnexion :",
                error
            );


            alert(
                "Erreur de déconnexion : " +
                error.message
            );

        }

    }
);


/* =========================================
   15. EVENEMENTS AUTH
========================================= */

supabaseClient
.auth
.onAuthStateChange(
    function(event, session) {

        console.log(
            "AUTH EVENT :",
            event
        );

    }
);


/* =========================================
   16. INITIALISER DASHBOARD
========================================= */

async function initialiserDashboard() {

    debug(
        "Initialisation du dashboard..."
    );


    await chargerCategories();


    await chargerProduits();

}


/* =========================================
   17. CHARGER CATEGORIES
========================================= */

async function chargerCategories() {

    debug(
        "Chargement des catégories..."
    );


    const {
        data,
        error
    } =
        await supabaseClient
        .from("categories")
        .select("*")
        .order(
            "name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Erreur catégories :",
            error
        );


        /*
         * Si la table categories
         * n'existe pas encore ou n'est
         * pas accessible, on ne bloque
         * pas le dashboard.
         */

        debug(
            "Impossible de charger les catégories."
        );


        return;

    }


    categories =
        data || [];


    const select =
        document.getElementById(
            "product-category"
        );


    if (!select)
        return;


    select.innerHTML = `

        <option value="">
            Choisir une catégorie
        </option>

    `;


    categories.forEach(
        function(categorie) {

            select.innerHTML += `

                <option
                    value="${echapperHTML(
                        categorie.name
                    )}"
                >
                    ${echapperHTML(
                        categorie.name
                    )}
                </option>

            `;

        }
    );


    debug(
        categories.length +
        " catégorie(s) chargée(s)."
    );

}


/* =========================================
   18. CHARGER PRODUITS
========================================= */

async function chargerProduits() {

    debug(
        "Chargement des produits..."
    );


    const {
        data,
        error
    } =
        await supabaseClient
        .from("products")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(
            "Erreur produits :",
            error
        );


        debug(
            "Erreur produits : " +
            error.message
        );


        alert(
            "Impossible de charger les produits."
        );


        return;

    }


    produits =
        data || [];


    debug(
        produits.length +
        " produit(s) chargé(s)."
    );


    afficherStatistiques();


    afficherProduits(
        produits
    );

}


/* =========================================
   19. STATISTIQUES
========================================= */

function afficherStatistiques() {

    const totalProducts =
        produits.length;


    const totalStock =
        produits.reduce(
            function(total, produit) {

                return total +
                    Number(
                        produit.stock || 0
                    );

            },
            0
        );


    const stockValue =
        produits.reduce(
            function(total, produit) {

                return total +
                    (
                        Number(
                            produit.price || 0
                        )
                        *
                        Number(
                            produit.stock || 0
                        )
                    );

            },
            0
        );


    const totalElement =
        document.getElementById(
            "total-products"
        );


    const stockElement =
        document.getElementById(
            "total-stock"
        );


    const valueElement =
        document.getElementById(
            "stock-value"
        );


    if (totalElement) {

        totalElement.textContent =
            totalProducts;

    }


    if (stockElement) {

        stockElement.textContent =
            totalStock;

    }


    if (valueElement) {

        valueElement.textContent =
            stockValue.toLocaleString(
                "fr-FR"
            ) +
            " FCFA";

    }

}


/* =========================================
   20. AFFICHER PRODUITS
========================================= */

function afficherProduits(
    liste = produits
) {

    const container =
        document.getElementById(
            "admin-products"
        );


    if (!container)
        return;


    if (!liste.length) {

        container.innerHTML = `

            <p>
                Aucun produit enregistré.
            </p>

        `;


        return;

    }


    container.innerHTML =
        liste
        .map(
            function(produit) {

                let imageHTML;


                if (
                    produit.image_url
                ) {

                    imageHTML = `

                        <img
                            src="${echapperAttribut(
                                produit.image_url
                            )}"
                            alt="${echapperAttribut(
                                produit.name
                            )}"
                            loading="lazy"
                        >

                    `;

                }

                else {

                    imageHTML = "🧼";

                }


                const stock =
                    Number(
                        produit.stock || 0
                    );


                const stockClass =
                    stock > 0
                    ? "stock-good"
                    : "stock-empty";


                return `

                    <article
                        class="admin-product"
                    >


                        <div
                            class="admin-product-image"
                        >

                            ${imageHTML}

                        </div>


                        <div
                            class="admin-product-info"
                        >


                            <h3>
                                ${echapperHTML(
                                    produit.name || ""
                                )}
                            </h3>


                            <p
                                class="admin-description"
                            >
                                ${echapperHTML(
                                    produit.description || ""
                                )}
                            </p>


                            <div
                                class="admin-price"
                            >
                                ${
                                    Number(
                                        produit.price || 0
                                    ).toLocaleString(
                                        "fr-FR"
                                    )
                                }
                                FCFA
                            </div>


                            <div
                                class="admin-stock ${stockClass}"
                            >
                                Stock :
                                ${stock}
                            </div>


                            <div
                                class="admin-actions"
                            >


                                <button
                                    type="button"
                                    class="edit-button"
                                    data-action="edit"
                                    data-id="${produit.id}"
                                >
                                    ✏️ Modifier
                                </button>


                                <button
                                    type="button"
                                    class="delete-button"
                                    data-action="delete"
                                    data-id="${produit.id}"
                                >
                                    🗑️ Supprimer
                                </button>


                            </div>


                        </div>


                    </article>

                `;

            }
        )
        .join("");


    /* Gestion des boutons */

    container
    .querySelectorAll(
        "[data-action='edit']"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    modifierProduit(
                        Number(
                            this.dataset.id
                        )
                    );

                }
            );

        }
    );


    container
    .querySelectorAll(
        "[data-action='delete']"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    supprimerProduit(
                        Number(
                            this.dataset.id
                        )
                    );

                }
            );

        }
    );

}


/* =========================================
   21. APERCU IMAGE
========================================= */

productImage.addEventListener(
    "change",
    function(event) {

        const fichier =
            event.target.files[0];


        if (!fichier) {

            fichierImage =
                null;

            return;

        }


        if (
            !fichier.type.startsWith(
                "image/"
            )
        ) {

            alert(
                "Veuillez sélectionner une image."
            );


            productImage.value =
                "";


            fichierImage =
                null;


            return;

        }


        /*
         * Limite : 5 Mo
         */

        if (
            fichier.size >
            5 * 1024 * 1024
        ) {

            alert(
                "L'image ne doit pas dépasser 5 Mo."
            );


            productImage.value =
                "";


            fichierImage =
                null;


            return;

        }


        fichierImage =
            fichier;


        const reader =
            new FileReader();


        reader.onload =
            function(event) {

                imagePreview.innerHTML = `

                    <img
                        src="${event.target.result}"
                        alt="Aperçu"
                    >

                `;

            };


        reader.readAsDataURL(
            fichier
        );

    }
);


/* =========================================
   22. UPLOAD IMAGE
========================================= */

async function envoyerImage(
    fichier
) {

    if (!fichier) {

        return null;

    }


    const extension =
        fichier.name
        .split(".")
        .pop()
        .toLowerCase();


    const nomFichier =
        Date.now()
        +
        "-"
        +
        Math.random()
            .toString(36)
            .substring(2, 10)
        +
        "."
        +
        extension;


    debug(
        "Upload image : " +
        nomFichier
    );


    const {
        data,
        error
    } =
        await supabaseClient
        .storage
        .from("Product-images")
        .upload(
            nomFichier,
            fichier,
            {
                cacheControl: "3600",
                upsert: false
            }
        );


    if (error) {

        console.error(
            "Erreur upload image :",
            error
        );


        throw error;

    }


    debug(
        "Image uploadée avec succès."
    );


    const {
        data: publicData
    } =
        supabaseClient
        .storage
        .from("Product-images")
        .getPublicUrl(
            data.path
        );


    if (
        !publicData ||
        !publicData.publicUrl
    ) {

        throw new Error(
            "Impossible de récupérer l'URL publique de l'image."
        );

    }


    debug(
        "URL publique obtenue."
    );


    return publicData.publicUrl;

}


/* =========================================
   23. ENREGISTRER PRODUIT
========================================= */

productForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const id =
            document
            .getElementById(
                "product-id"
            )
            .value;


        const name =
            document
            .getElementById(
                "product-name"
            )
            .value
            .trim();


        const description =
            document
            .getElementById(
                "product-description"
            )
            .value
            .trim();


        const composition =
            document
            .getElementById(
                "product-composition"
            )
            .value
            .trim();


        const weight =
            document
            .getElementById(
                "product-weight"
            )
            .value
            .trim();


        const price =
            Number(
                document
                .getElementById(
                    "product-price"
                )
                .value
            );


        const stock =
            Number(
                document
                .getElementById(
                    "product-stock"
                )
                .value
            );


        const category =
            document
            .getElementById(
                "product-category"
            )
            .value
            .trim();


        /* Validation */

        if (
            !name ||
            !description ||
            !category ||
            !Number.isFinite(price) ||
            price < 0 ||
            !Number.isFinite(stock) ||
            stock < 0
        ) {

            alert(
                "Veuillez remplir correctement les champs obligatoires."
            );


            return;

        }


        const bouton =
            productForm.querySelector(
                "button[type='submit']"
            );


        bouton.disabled =
            true;


        bouton.textContent =
            "Enregistrement...";


        try {

            let imageUrl =
                imageUrlActuelle;


            /* ==========================
               NOUVELLE IMAGE
            ========================== */

            if (fichierImage) {

                imageUrl =
                    await envoyerImage(
                        fichierImage
                    );

            }


            /* ==========================
               DONNEES PRODUIT
            ========================== */

            const produitData = {

                name,

                description,

                composition,

                weight,

                price,

                stock,

                category

            };


            /*
             * On ajoute image_url uniquement
             * si nous avons une URL.
             */

            if (imageUrl) {

                produitData.image_url =
                    imageUrl;

            }


            /* ==========================
               MODIFICATION
            ========================== */

            if (id) {

                debug(
                    "Modification produit ID " +
                    id
                );


                const {
                    error
                } =
                    await supabaseClient
                    .from("products")
                    .update(
                        produitData
                    )
                    .eq(
                        "id",
                        Number(id)
                    );


                if (error) {

                    throw error;

                }


                alert(
                    "Produit modifié avec succès."
                );

            }


            /* ==========================
               AJOUT
            ========================== */

            else {

                debug(
                    "Ajout nouveau produit..."
                );


                const {
                    error
                } =
                    await supabaseClient
                    .from("products")
                    .insert(
                        produitData
                    );


                if (error) {

                    throw error;

                }


                alert(
                    "Produit ajouté avec succès."
                );

            }


            viderFormulaireProduit();


            await chargerProduits();

        }

        catch(error) {

            console.error(
                "Erreur enregistrement produit :",
                error
            );


            alert(
                "Erreur : " +
                error.message
            );

        }

        finally {

            bouton.disabled =
                false;


            bouton.textContent =
                "💾 Enregistrer le produit";

        }

    }
);


/* =========================================
   24. MODIFIER PRODUIT
========================================= */

function modifierProduit(id) {

    const produit =
        produits.find(
            function(item) {

                return item.id === id;

            }
        );


    if (!produit) {

        alert(
            "Produit introuvable."
        );


        return;

    }


    document.getElementById(
        "form-title"
    ).textContent =
        "Modifier le produit";


    document.getElementById(
        "product-id"
    ).value =
        produit.id;


    document.getElementById(
        "product-name"
    ).value =
        produit.name || "";


    document.getElementById(
        "product-description"
    ).value =
        produit.description || "";


    document.getElementById(
        "product-composition"
    ).value =
        produit.composition || "";


    document.getElementById(
        "product-weight"
    ).value =
        produit.weight || "";


    document.getElementById(
        "product-price"
    ).value =
        produit.price || 0;


    document.getElementById(
        "product-stock"
    ).value =
        produit.stock || 0;


    document.getElementById(
        "product-category"
    ).value =
        produit.category || "";


    imageUrlActuelle =
        produit.image_url || null;


    fichierImage =
        null;


    productImage.value =
        "";


    if (produit.image_url) {

        imagePreview.innerHTML = `

            <img
                src="${echapperAttribut(
                    produit.image_url
                )}"
                alt="${echapperAttribut(
                    produit.name
                )}"
            >

        `;

    }

    else {

        imagePreview.innerHTML =
            "";

    }


    cancelEditButton.style.display =
        "inline-block";


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* =========================================
   25. ANNULER MODIFICATION
========================================= */

cancelEditButton.addEventListener(
    "click",
    function() {

        viderFormulaireProduit();

    }
);


/* =========================================
   26. VIDER FORMULAIRE
========================================= */

function viderFormulaireProduit() {

    productForm.reset();


    document.getElementById(
        "product-id"
    ).value =
        "";


    fichierImage =
        null;


    imageUrlActuelle =
        null;


    imagePreview.innerHTML =
        "";


    document.getElementById(
        "form-title"
    ).textContent =
        "Ajouter un produit";


    cancelEditButton.style.display =
        "none";

}


/* =========================================
   27. SUPPRIMER PRODUIT
========================================= */

async function supprimerProduit(id) {

    const produit =
        produits.find(
            function(item) {

                return item.id === id;

            }
        );


    if (!produit)
        return;


    const confirmation =
        confirm(
            "Voulez-vous vraiment supprimer « " +
            produit.name +
            " » ?"
        );


    if (!confirmation)
        return;


    try {

        debug(
            "Suppression produit ID " +
            id
        );


        const {
            error
        } =
            await supabaseClient
            .from("products")
            .delete()
            .eq(
                "id",
                id
            );


        if (error) {

            throw error;

        }


        alert(
            "Produit supprimé avec succès."
        );


        await chargerProduits();

    }

    catch(error) {

        console.error(
            "Erreur suppression :",
            error
        );


        alert(
            "Erreur : " +
            error.message
        );

    }

}


/* =========================================
   28. RECHERCHE
========================================= */

searchInput.addEventListener(
    "input",
    function() {

        const recherche =
            this.value
            .toLowerCase()
            .trim();


        if (!recherche) {

            afficherProduits(
                produits
            );


            return;

        }


        const resultat =
            produits.filter(
                function(produit) {

                    const nom =
                        (
                            produit.name ||
                            ""
                        )
                        .toLowerCase();


                    const description =
                        (
                            produit.description ||
                            ""
                        )
                        .toLowerCase();


                    const categorie =
                        (
                            produit.category ||
                            ""
                        )
                        .toLowerCase();


                    return (
                        nom.includes(
                            recherche
                        )
                        ||
                        description.includes(
                            recherche
                        )
                        ||
                        categorie.includes(
                            recherche
                        )
                    );

                }
            );


        afficherProduits(
            resultat
        );

    }
);


/* =========================================
   29. SECURITE HTML
========================================= */

function echapperHTML(
    valeur
) {

    return String(
        valeur ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


function echapperAttribut(
    valeur
) {

    return echapperHTML(
        valeur
    );

}


/* =========================================
   30. DEMARRAGE
========================================= */

debug(
    "Démarrage de l'administration..."
);


verifierSession();