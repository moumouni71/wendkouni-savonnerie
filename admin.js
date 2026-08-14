alert("admin.js fonctionne !");
/* =========================================
   WENDKOUNI SAVONNERIE
   V3.2 ADMINISTRATION
========================================= */


/* =========================================
   SUPABASE
========================================= */

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================
   VARIABLES
========================================= */

let produits = [];

let categories = [];

let imageActuelle = null;


/* =========================================
   ELEMENTS
========================================= */

const loginPage =
    document.getElementById("login-page");

const dashboard =
    document.getElementById("dashboard");

const loginForm =
    document.getElementById("login-form");

const loginMessage =
    document.getElementById("login-message");


/* =========================================
   VERIFIER SESSION
========================================= */

async function verifierSession() {

    const {
        data: {
            session
        },
        error
    } = await supabaseClient.auth.getSession();


    if (error) {

        console.error("Erreur session :", error);

        afficherConnexion();

        return;
    }


    if (!session) {

        afficherConnexion();

        return;
    }


    console.log(
        "Utilisateur connecté :",
        session.user.email
    );


    const {
        data: admin,
        error: adminError
    } =
        await supabaseClient
        .from("admins")
        .select("user_id")
        .eq(
            "user_id",
            session.user.id
        )
        .maybeSingle();


    if (adminError) {

        console.error(
            "Erreur vérification admin :",
            adminError
        );

        afficherMessage(
            "Erreur de vérification administrateur."
        );

        return;
    }


    if (!admin) {

        console.error(
            "Cet utilisateur n'est pas administrateur."
        );

        await supabaseClient
            .auth
            .signOut();

        afficherConnexion();

        afficherMessage(
            "Ce compte n'est pas administrateur."
        );

        return;
    }


    console.log(
        "Administrateur confirmé."
    );


    afficherDashboard();
}

    /* Vérifier que l'utilisateur est admin */

    const {
        data,
        error
    } =
        await supabaseClient
        .from("admins")
        .select("user_id")
        .eq(
            "user_id",
            session.user.id
        )
        .maybeSingle();


    if (error || !data) {

        await supabaseClient
            .auth
            .signOut();


        afficherConnexion();


        afficherMessage(
            "Ce compte n'est pas administrateur."
        );


        return;
    }


    afficherDashboard();

}


/* =========================================
   CONNEXION
========================================= */

loginForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const email =
            document
            .getElementById("email")
            .value
            .trim();


        const password =
            document
            .getElementById("password")
            .value;


        afficherMessage(
            "Connexion en cours...",
            true
        );


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
                "Erreur de connexion :",
                error
            );

            afficherMessage(
                error.message
            );

            return;
        }


        console.log(
            "Connexion réussie :",
            data.user.email
        );


        const {
            data: admin,
            error: adminError
        } =
            await supabaseClient
            .from("admins")
            .select("user_id")
            .eq(
                "user_id",
                data.user.id
            )
            .maybeSingle();


        if (adminError) {

            console.error(
                "Erreur admin :",
                adminError
            );

            afficherMessage(
                "Impossible de vérifier les droits administrateur."
            );

            return;
        }


        if (!admin) {

            await supabaseClient
                .auth
                .signOut();


            afficherMessage(
                "Ce compte n'est pas administrateur."
            );

            return;
        }


        afficherDashboard();

    }
);

        /* Vérification admin */

        const {
            data: admin,
            error: adminError
        } =
            await supabaseClient
            .from("admins")
            .select("user_id")
            .eq(
                "user_id",
                data.user.id
            )
            .maybeSingle();


        if (adminError || !admin) {

            await supabaseClient
                .auth
                .signOut();


            afficherMessage(
                "Ce compte n'a pas les droits administrateur."
            );


            return;
        }


        afficherDashboard();

    }
);


/* =========================================
   AFFICHER CONNEXION
========================================= */

function afficherConnexion() {

    loginPage.style.display =
        "flex";

    dashboard.style.display =
        "none";
}


/* =========================================
   AFFICHER DASHBOARD
========================================= */

async function afficherDashboard() {

    loginPage.style.display =
        "none";

    dashboard.style.display =
        "block";


    await chargerCategories();

    await chargerProduits();

}


/* =========================================
   MESSAGE
========================================= */

function afficherMessage(
    message,
    erreur = true
) {

    loginMessage.textContent =
        message;


    loginMessage.style.color =
        erreur
        ? "#c0392b"
        : "#368454";

}


/* =========================================
   CHARGER CATEGORIES
========================================= */

async function chargerCategories() {

    const {
        data,
        error
    } =
        await supabaseClient
        .from("categories")
        .select("*")
        .order("name");


    if (error) {

        console.error(error);

        return;
    }


    categories =
        data || [];


    const select =
        document.getElementById(
            "product-category"
        );


    select.innerHTML = `

        <option value="">
            Choisir une catégorie
        </option>

    `;


    categories.forEach(categorie => {

        select.innerHTML += `

            <option value="${categorie.name}">
                ${categorie.name}
            </option>

        `;

    });

}


/* =========================================
   CHARGER PRODUITS
========================================= */

async function chargerProduits() {

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

        console.error(error);

        alert(
            "Impossible de charger les produits."
        );

        return;
    }


    produits =
        data || [];


    afficherStatistiques();

    afficherProduits();

}


/* =========================================
   STATISTIQUES
========================================= */

function afficherStatistiques() {

    const totalProducts =
        produits.length;


    const totalStock =
        produits.reduce(
            (total, produit) =>
                total +
                Number(produit.stock || 0),
            0
        );


    const stockValue =
        produits.reduce(
            (total, produit) =>
                total +
                (
                    Number(produit.price || 0)
                    *
                    Number(produit.stock || 0)
                ),
            0
        );


    document.getElementById(
        "total-products"
    ).textContent =
        totalProducts;


    document.getElementById(
        "total-stock"
    ).textContent =
        totalStock;


    document.getElementById(
        "stock-value"
    ).textContent =
        stockValue.toLocaleString()
        + " FCFA";

}


/* =========================================
   AFFICHER PRODUITS
========================================= */

function afficherProduits(
    liste = produits
) {

    const container =
        document.getElementById(
            "admin-products"
        );


    container.innerHTML = "";


    if (!liste.length) {

        container.innerHTML = `

            <p>
                Aucun produit trouvé.
            </p>

        `;

        return;
    }


    liste.forEach(produit => {

        let image = "🧼";


        if (produit.image_url) {

            image = `

                <img
                    src="${produit.image_url}"
                    alt="${produit.name}">

            `;

        }


        const stockClass =
            produit.stock > 0
            ? "stock-good"
            : "stock-empty";


        container.innerHTML += `

            <article
                class="admin-product">


                <div
                    class="admin-product-image">

                    ${image}

                </div>


                <div
                    class="admin-product-info">


                    <h3>
                        ${produit.name}
                    </h3>


                    <p
                        class="admin-description">

                        ${produit.description || ""}

                    </p>


                    <div
                        class="admin-price">

                        ${Number(produit.price)
                            .toLocaleString()}
                        FCFA

                    </div>


                    <div
                        class="admin-stock
                        ${stockClass}">

                        Stock :
                        ${produit.stock}

                    </div>


                    <div
                        class="admin-actions">


                        <button
                            class="edit-button"
                            onclick="
                                modifierProduit(
                                    ${produit.id}
                                )
                            ">

                            ✏️ Modifier

                        </button>


                        <button
                            class="delete-button"
                            onclick="
                                supprimerProduit(
                                    ${produit.id}
                                )
                            ">

                            🗑️ Supprimer

                        </button>


                    </div>


                </div>


            </article>

        `;

    });

}


/* =========================================
   RECHERCHE ADMIN
========================================= */

document
.getElementById("admin-search")
.addEventListener(
    "input",
    function() {

        const recherche =
            this.value
            .toLowerCase()
            .trim();


        const resultat =
            produits.filter(
                produit =>

                    produit.name
                    .toLowerCase()
                    .includes(recherche)

                    ||

                    (produit.description || "")
                    .toLowerCase()
                    .includes(recherche)

            );


        afficherProduits(resultat);

    }
);


/* =========================================
   IMAGE
========================================= */

document
.getElementById("product-image")
.addEventListener(
    "change",
    function(event) {

        const fichier =
            event.target.files[0];


        if (!fichier)
            return;


        const reader =
            new FileReader();


        reader.onload =
            function(e) {

                imageActuelle =
                    e.target.result;


                document
                .getElementById(
                    "image-preview"
                )
                .innerHTML = `

                    <img
                        src="${imageActuelle}"
                        alt="Aperçu">

                `;

            };


        reader.readAsDataURL(
            fichier
        );

    }
);


/* =========================================
   ENREGISTRER PRODUIT
========================================= */

document
.getElementById("product-form")
.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const id =
            document
            .getElementById("product-id")
            .value;


        const name =
            document
            .getElementById("product-name")
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
            .value;


        if (
            !name ||
            !description ||
            !category ||
            price < 0 ||
            stock < 0
        ) {

            alert(
                "Veuillez remplir correctement les champs obligatoires."
            );

            return;
        }


        const bouton =
            document.querySelector(
                "#product-form .primary-button"
            );


        bouton.disabled = true;

        bouton.textContent =
            "Enregistrement...";


        try {

            let imageUrl =
                null;


            /*
             * Pour cette étape,
             * si une nouvelle image est sélectionnée,
             * elle sera traitée à l'étape Storage.
             */

            if (imageActuelle &&
                imageActuelle.startsWith("http")) {

                imageUrl =
                    imageActuelle;

            }


            const produitData = {

                name,

                description,

                composition,

                weight,

                price,

                stock,

                category

            };


            if (imageUrl) {

                produitData.image_url =
                    imageUrl;

            }


            let resultat;


            /* MODIFICATION */

            if (id) {

                resultat =
                    await supabaseClient
                    .from("products")
                    .update(
                        produitData
                    )
                    .eq(
                        "id",
                        Number(id)
                    );

            }


            /* AJOUT */

            else {

                resultat =
                    await supabaseClient
                    .from("products")
                    .insert(
                        produitData
                    );

            }


            if (resultat.error) {

                throw resultat.error;

            }


            alert(
                id
                ? "Produit modifié avec succès."
                : "Produit ajouté avec succès."
            );


            viderFormulaire();

            await chargerProduits();

        }

        catch(error) {

            console.error(error);


            alert(
                "Erreur : " +
                error.message
            );

        }

        finally {

            bouton.disabled = false;

            bouton.textContent =
                "💾 Enregistrer le produit";

        }

    }
);


/* =========================================
   MODIFIER PRODUIT
========================================= */

function modifierProduit(id) {

    const produit =
        produits.find(
            produit =>
                produit.id === id
        );


    if (!produit)
        return;


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
        produit.name;


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
        produit.price;


    document.getElementById(
        "product-stock"
    ).value =
        produit.stock;


    document.getElementById(
        "product-category"
    ).value =
        produit.category;


    imageActuelle =
        produit.image_url || null;


    if (produit.image_url) {

        document.getElementById(
            "image-preview"
        ).innerHTML = `

            <img
                src="${produit.image_url}"
                alt="${produit.name}">

        `;

    }
    else {

        document.getElementById(
            "image-preview"
        ).innerHTML = "";

    }


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* =========================================
   SUPPRIMER
========================================= */

async function supprimerProduit(id) {

    const produit =
        produits.find(
            produit =>
                produit.id === id
        );


    if (!produit)
        return;


    const confirmation =
        confirm(
            `Supprimer "${produit.name}" ?`
        );


    if (!confirmation)
        return;


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

        console.error(error);


        alert(
            "Impossible de supprimer le produit : " +
            error.message
        );


        return;
    }


    alert(
        "Produit supprimé."
    );


    await chargerProduits();

}


/* =========================================
   ANNULER
========================================= */

document
.getElementById("cancel-edit")
.addEventListener(
    "click",
    viderFormulaire
);


function viderFormulaire() {

    document
    .getElementById(
        "product-form"
    )
    .reset();


    document.getElementById(
        "product-id"
    ).value = "";


    document.getElementById(
        "form-title"
    ).textContent =
        "Ajouter un produit";


    document.getElementById(
        "image-preview"
    ).innerHTML = "";


    imageActuelle = null;

}


/* =========================================
   DÉCONNEXION
========================================= */

document
.getElementById("logout-button")
.addEventListener(
    "click",
    async function() {

        await supabaseClient
            .auth
            .signOut();


        afficherConnexion();

    }
);


/* =========================================
   SURVEILLER SESSION
========================================= */

supabaseClient
.auth
.onAuthStateChange(
    function(event, session) {

        if (!session) {

            afficherConnexion();

        }

    }
);


/* =========================================
   DÉMARRAGE
========================================= */

verifierSession();