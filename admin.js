/* =========================================================
   WENDKOUNI SAVONNERIE
   ADMIN.JS — VERSION CORRIGÉE
   Authentification + Produits + Images + Commandes + Exports
========================================================= */

"use strict";

/* =========================================================
   1. CONFIGURATION ET SUPABASE
========================================================= */

if (
    typeof SUPABASE_URL === "undefined" ||
    typeof SUPABASE_KEY === "undefined"
) {
    console.error("SUPABASE_URL ou SUPABASE_KEY introuvable.");
    alert("Erreur : config.js n'est pas correctement chargé.");
    throw new Error("Configuration Supabase absente.");
}

if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
) {
    console.error("Bibliothèque Supabase non chargée.");
    alert("Erreur : la bibliothèque Supabase n'est pas chargée.");
    throw new Error("Supabase JS indisponible.");
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("WENDKOUNI SAVONNERIE — ADMIN.JS chargé");

/* =========================================================
   2. VARIABLES
========================================================= */

let produits = [];
let categories = [];
let commandesAdmin = [];

let fichierImage = null;
let imageUrlActuelle = null;

/* =========================================================
   3. ELEMENTS HTML
========================================================= */

const loginPage = document.getElementById("login-page");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const logoutButton = document.getElementById("logout-button");
const adminEmail = document.getElementById("admin-email");

const productForm = document.getElementById("product-form");
const productImage = document.getElementById("product-image");
const imagePreview = document.getElementById("image-preview");
const cancelEditButton = document.getElementById("cancel-edit-button");
const searchInput = document.getElementById("admin-search");

const refreshOrdersButton =
    document.getElementById("refresh-orders-button");

const exportOrdersButton =
    document.getElementById("export-orders-button");

const exportOrdersMenu =
    document.getElementById("export-orders-menu");

const exportExcelButton =
    document.getElementById("export-excel-button");

const exportPdfButton =
    document.getElementById("export-pdf-button");

const exportWordButton =
    document.getElementById("export-word-button");

/* =========================================================
   4. OUTILS
========================================================= */

function debug(message, ...args) {
    console.log("[ADMIN]", message, ...args);
}

function afficherMessage(message, erreur = true) {
    if (!loginMessage) return;

    loginMessage.textContent = message;
    loginMessage.style.color =
        erreur ? "#c0392b" : "#368454";
}

function echapperHTML(valeur) {
    return String(valeur ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formaterNombre(valeur) {
    return Number(valeur || 0).toLocaleString("fr-FR");
}

function formaterDate(valeur) {
    if (!valeur) return "—";

    const date = new Date(valeur);

    if (Number.isNaN(date.getTime())) {
        return String(valeur);
    }

    return date.toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function afficherConnexion() {
    if (loginPage) loginPage.style.display = "flex";
    if (dashboard) dashboard.style.display = "none";
}

function afficherDashboard(utilisateur) {
    if (loginPage) loginPage.style.display = "none";
    if (dashboard) dashboard.style.display = "block";

    if (adminEmail) {
        adminEmail.textContent = utilisateur?.email || "—";
    }
}

/* =========================================================
   5. VERIFICATION ADMINISTRATEUR
========================================================= */

async function verifierAdministrateur(utilisateur) {
    if (!utilisateur?.id) return false;

    const { data, error } = await supabaseClient
        .from("admins")
        .select("user_id")
        .eq("user_id", utilisateur.id)
        .maybeSingle();

    if (error) {
        console.error("Erreur table admins :", error);
        throw error;
    }

    return Boolean(data);
}

/* =========================================================
   6. SESSION
========================================================= */

async function verifierSession() {
    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) throw error;

        const session = data?.session;

        if (!session) {
            afficherConnexion();
            return;
        }

        const estAdmin =
            await verifierAdministrateur(session.user);

        if (!estAdmin) {
            await supabaseClient.auth.signOut();
            afficherConnexion();
            afficherMessage(
                "Ce compte n'est pas administrateur."
            );
            return;
        }

        afficherDashboard(session.user);
        await initialiserDashboard();

    } catch (error) {
        console.error("Erreur verifierSession :", error);
        afficherConnexion();
        afficherMessage(
            "Impossible de vérifier la session."
        );
    }
}

/* =========================================================
   7. CONNEXION
========================================================= */

if (loginForm) {
    loginForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const email =
            document.getElementById("email")?.value.trim() || "";

        const password =
            document.getElementById("password")?.value || "";

        if (!email || !password) {
            afficherMessage(
                "Veuillez saisir votre e-mail et votre mot de passe."
            );
            return;
        }

        const bouton =
            loginForm.querySelector("button[type='submit']");

        if (bouton) {
            bouton.disabled = true;
            bouton.textContent = "Connexion...";
        }

        afficherMessage("Connexion en cours...", false);

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) throw error;

            if (!data?.user) {
                throw new Error("Utilisateur non trouvé.");
            }

            const estAdmin =
                await verifierAdministrateur(data.user);

            if (!estAdmin) {
                await supabaseClient.auth.signOut();
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

            afficherDashboard(data.user);
            await initialiserDashboard();

        } catch (error) {
            console.error("Erreur connexion :", error);
            afficherConnexion();
            afficherMessage(
                error?.message ||
                "Erreur pendant la connexion."
            );

        } finally {
            if (bouton) {
                bouton.disabled = false;
                bouton.textContent = "🔐 Se connecter";
            }
        }
    });
}

/* =========================================================
   8. DECONNEXION
========================================================= */

if (logoutButton) {
    logoutButton.addEventListener("click", async function() {
        try {
            const { error } =
                await supabaseClient.auth.signOut();

            if (error) throw error;

            afficherConnexion();
            afficherMessage(
                "Vous êtes déconnecté.",
                false
            );

        } catch (error) {
            console.error("Erreur déconnexion :", error);
            alert(
                "Erreur de déconnexion : " +
                (error?.message || "Erreur inconnue")
            );
        }
    });
}

/* =========================================================
   9. INITIALISATION DU DASHBOARD
========================================================= */

async function initialiserDashboard() {
    debug("Initialisation du dashboard...");

    await chargerCategories();
    await chargerProduits();
    await chargerCommandes();
}

/* =========================================================
   10. CATEGORIES
========================================================= */

async function chargerCategories() {
    const select =
        document.getElementById("product-category");

    if (!select) return;

    try {
        const { data, error } =
            await supabaseClient
                .from("categories")
                .select("*")
                .order("name", { ascending: true });

        if (error) throw error;

        categories = data || [];

        select.innerHTML = `
            <option value="">Choisir une catégorie</option>
        `;

        categories.forEach(function(categorie) {
            const option = document.createElement("option");
            option.value = categorie.name || "";
            option.textContent = categorie.name || "";
            select.appendChild(option);
        });

        debug(
            `${categories.length} catégorie(s) chargée(s).`
        );

    } catch (error) {
        console.error("Erreur catégories :", error);

        categories = [];

        select.innerHTML = `
            <option value="">
                Catégories indisponibles
            </option>
        `;

        debug("Les catégories ne peuvent pas être chargées.");
    }
}

/* =========================================================
   11. PRODUITS — CHARGEMENT
========================================================= */

async function chargerProduits() {
    try {
        const { data, error } =
            await supabaseClient
                .from("products")
                .select("*")
                .order("created_at", {
                    ascending: false
                });

        if (error) throw error;

        produits = data || [];

        afficherStatistiques();
        afficherProduits(produits);

        debug(
            `${produits.length} produit(s) chargé(s).`
        );

    } catch (error) {
        console.error("Erreur produits :", error);

        const container =
            document.getElementById("admin-products");

        if (container) {
            container.innerHTML = `
                <p>
                    Impossible de charger les produits.
                </p>
            `;
        }
    }
}

/* =========================================================
   12. STATISTIQUES PRODUITS
========================================================= */

function afficherStatistiques() {
    const totalProducts = produits.length;

    const totalStock = produits.reduce(
        function(total, produit) {
            return total + Number(produit.stock || 0);
        },
        0
    );

    const stockValue = produits.reduce(
        function(total, produit) {
            return total +
                (
                    Number(produit.price || 0) *
                    Number(produit.stock || 0)
                );
        },
        0
    );

    const totalElement =
        document.getElementById("total-products");

    const stockElement =
        document.getElementById("total-stock");

    const valueElement =
        document.getElementById("stock-value");

    if (totalElement) {
        totalElement.textContent = totalProducts;
    }

    if (stockElement) {
        stockElement.textContent = totalStock;
    }

    if (valueElement) {
        valueElement.textContent =
            formaterNombre(stockValue) + " FCFA";
    }
}

/* =========================================================
   13. PRODUITS — AFFICHAGE
========================================================= */

function afficherProduits(liste = produits) {
    const container =
        document.getElementById("admin-products");

    if (!container) return;

    if (!liste.length) {
        container.innerHTML = `
            <p>Aucun produit enregistré.</p>
        `;
        return;
    }

    container.innerHTML = liste.map(function(produit) {
        const stock = Number(produit.stock || 0);

        const imageHTML = produit.image_url
            ? `
                <img
                    src="${echapperHTML(produit.image_url)}"
                    alt="${echapperHTML(produit.name)}"
                    loading="lazy"
                >
            `
            : "🧼";

        return `
            <article class="admin-product">

                <div class="admin-product-image">
                    ${imageHTML}
                </div>

                <div class="admin-product-info">

                    <h3>
                        ${echapperHTML(produit.name || "")}
                    </h3>

                    <p class="admin-description">
                        ${echapperHTML(
                            produit.description || ""
                        )}
                    </p>

                    <div class="admin-price">
                        ${formaterNombre(produit.price)}
                        FCFA
                    </div>

                    <div class="admin-stock ${
                        stock > 0
                            ? "stock-good"
                            : "stock-empty"
                    }">
                        Stock : ${stock}
                    </div>

                    <div class="admin-actions">

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
    }).join("");

    container
        .querySelectorAll("[data-action='edit']")
        .forEach(function(button) {
            button.addEventListener("click", function() {
                modifierProduit(
                    Number(this.dataset.id)
                );
            });
        });

    container
        .querySelectorAll("[data-action='delete']")
        .forEach(function(button) {
            button.addEventListener("click", function() {
                supprimerProduit(
                    Number(this.dataset.id)
                );
            });
        });
}

/* =========================================================
   14. APERCU IMAGE
========================================================= */

if (productImage) {
    productImage.addEventListener("change", function(event) {
        const fichier = event.target.files?.[0];

        if (!fichier) {
            fichierImage = null;
            return;
        }

        if (!fichier.type.startsWith("image/")) {
            alert("Veuillez sélectionner une image.");
            productImage.value = "";
            fichierImage = null;
            return;
        }

        if (fichier.size > 5 * 1024 * 1024) {
            alert("L'image ne doit pas dépasser 5 Mo.");
            productImage.value = "";
            fichierImage = null;
            return;
        }

        fichierImage = fichier;

        const reader = new FileReader();

        reader.onload = function(readerEvent) {
            if (!imagePreview) return;

            const img = document.createElement("img");
            img.src = readerEvent.target.result;
            img.alt = "Aperçu";
            imagePreview.replaceChildren(img);
        };

        reader.readAsDataURL(fichier);
    });
}

/* =========================================================
   15. UPLOAD IMAGE SUPABASE STORAGE
========================================================= */

async function envoyerImage(fichier) {
    if (!fichier) return null;

    const extension =
        fichier.name.includes(".")
            ? fichier.name.split(".").pop().toLowerCase()
            : "jpg";

    const nomFichier =
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 10) +
        "." +
        extension;

    const { data, error } =
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

    if (error) throw error;

    const { data: publicData } =
        supabaseClient
            .storage
            .from("Product-images")
            .getPublicUrl(data.path);

    if (!publicData?.publicUrl) {
        throw new Error(
            "Impossible de récupérer l'URL publique de l'image."
        );
    }

    return publicData.publicUrl;
}

/* =========================================================
   16. ENREGISTRER PRODUIT
========================================================= */

if (productForm) {
    productForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const id =
            document.getElementById("product-id")?.value || "";

        const name =
            document.getElementById("product-name")
                ?.value.trim() || "";

        const description =
            document.getElementById("product-description")
                ?.value.trim() || "";

        const composition =
            document.getElementById("product-composition")
                ?.value.trim() || "";

        const weight =
            document.getElementById("product-weight")
                ?.value.trim() || "";

        const price = Number(
            document.getElementById("product-price")?.value
        );

        const stock = Number(
            document.getElementById("product-stock")?.value
        );

        const category =
            document.getElementById("product-category")
                ?.value.trim() || "";

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

        if (bouton) {
            bouton.disabled = true;
            bouton.textContent = "Enregistrement...";
        }

        try {
            let imageUrl = imageUrlActuelle;

            if (fichierImage) {
                imageUrl =
                    await envoyerImage(fichierImage);
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
                produitData.image_url = imageUrl;
            }

            if (id) {
                const { error } =
                    await supabaseClient
                        .from("products")
                        .update(produitData)
                        .eq("id", Number(id));

                if (error) throw error;

                alert("Produit modifié avec succès.");

            } else {
                const { error } =
                    await supabaseClient
                        .from("products")
                        .insert(produitData);

                if (error) throw error;

                alert("Produit ajouté avec succès.");
            }

            viderFormulaireProduit();
            await chargerProduits();

        } catch (error) {
            console.error(
                "Erreur enregistrement produit :",
                error
            );

            alert(
                "Erreur : " +
                (error?.message || "Enregistrement impossible.")
            );

        } finally {
            if (bouton) {
                bouton.disabled = false;
                bouton.textContent =
                    "💾 Enregistrer le produit";
            }
        }
    });
}

/* =========================================================
   17. MODIFIER PRODUIT
========================================================= */

function modifierProduit(id) {
    const produit = produits.find(
        function(item) {
            return Number(item.id) === Number(id);
        }
    );

    if (!produit) {
        alert("Produit introuvable.");
        return;
    }

    document.getElementById("form-title").textContent =
        "Modifier le produit";

    document.getElementById("product-id").value =
        produit.id;

    document.getElementById("product-name").value =
        produit.name || "";

    document.getElementById("product-description").value =
        produit.description || "";

    document.getElementById("product-composition").value =
        produit.composition || "";

    document.getElementById("product-weight").value =
        produit.weight || "";

    document.getElementById("product-price").value =
        produit.price ?? 0;

    document.getElementById("product-stock").value =
        produit.stock ?? 0;

    document.getElementById("product-category").value =
        produit.category || "";

    imageUrlActuelle =
        produit.image_url || null;

    fichierImage = null;

    if (productImage) {
        productImage.value = "";
    }

    if (imagePreview) {
        if (produit.image_url) {
            const img = document.createElement("img");
            img.src = produit.image_url;
            img.alt = produit.name || "Produit";
            imagePreview.replaceChildren(img);
        } else {
            imagePreview.replaceChildren();
        }
    }

    if (cancelEditButton) {
        cancelEditButton.style.display = "inline-block";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================================================
   18. ANNULER / VIDER FORMULAIRE
========================================================= */

function viderFormulaireProduit() {
    if (productForm) {
        productForm.reset();
    }

    const id =
        document.getElementById("product-id");

    if (id) id.value = "";

    fichierImage = null;
    imageUrlActuelle = null;

    if (imagePreview) {
        imagePreview.replaceChildren();
    }

    const formTitle =
        document.getElementById("form-title");

    if (formTitle) {
        formTitle.textContent = "Ajouter un produit";
    }

    if (cancelEditButton) {
        cancelEditButton.style.display = "none";
    }
}

if (cancelEditButton) {
    cancelEditButton.addEventListener(
        "click",
        viderFormulaireProduit
    );
}

/* =========================================================
   19. SUPPRIMER PRODUIT
========================================================= */

async function supprimerProduit(id) {
    const produit = produits.find(
        function(item) {
            return Number(item.id) === Number(id);
        }
    );

    if (!produit) return;

    if (
        !confirm(
            "Voulez-vous vraiment supprimer « " +
            produit.name +
            " » ?"
        )
    ) {
        return;
    }

    try {
        const { error } =
            await supabaseClient
                .from("products")
                .delete()
                .eq("id", Number(id));

        if (error) throw error;

        alert("Produit supprimé avec succès.");

        await chargerProduits();

    } catch (error) {
        console.error(
            "Erreur suppression produit :",
            error
        );

        alert(
            "Erreur : " +
            (error?.message || "Suppression impossible.")
        );
    }
}

/* =========================================================
   20. RECHERCHE PRODUITS
========================================================= */

if (searchInput) {
    searchInput.addEventListener("input", function() {
        const recherche =
            this.value.toLowerCase().trim();

        if (!recherche) {
            afficherProduits(produits);
            return;
        }

        const resultat = produits.filter(
            function(produit) {
                const nom =
                    String(produit.name || "")
                        .toLowerCase();

                const description =
                    String(produit.description || "")
                        .toLowerCase();

                const categorie =
                    String(produit.category || "")
                        .toLowerCase();

                return (
                    nom.includes(recherche) ||
                    description.includes(recherche) ||
                    categorie.includes(recherche)
                );
            }
        );

        afficherProduits(resultat);
    });
}

/* =========================================================
   21. COMMANDES — CHARGEMENT
========================================================= */

async function chargerCommandes() {
    const container =
        document.getElementById("admin-orders");

    try {
        const { data, error } =
            await supabaseClient
                .from("orders")
                .select("*")
                .order("created_at", {
                    ascending: false
                });

        if (error) throw error;

        /*
         * IMPORTANT :
         * On conserve les commandes en mémoire.
         * Les exports utilisent cette variable.
         */
        commandesAdmin = data || [];

        debug(
            `${commandesAdmin.length} commande(s) chargée(s).`
        );

        await afficherCommandes(commandesAdmin);

    } catch (error) {
        console.error("Erreur commandes :", error);

        commandesAdmin = [];

        if (container) {
            container.innerHTML = `
                <p>
                    Impossible de charger les commandes.
                </p>
            `;
        }
    }
}

/* =========================================================
   22. COMMANDES — AFFICHAGE
========================================================= */

async function afficherCommandes(commandes) {
    const container =
        document.getElementById("admin-orders");

    if (!container) return;

    if (!commandes.length) {
        container.innerHTML = `
            <div class="order-empty">
                <p>📦 Aucune commande pour le moment.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <p class="orders-count">
            ${commandes.length} commande(s)
        </p>
    `;

    for (const commande of commandes) {
        const articleHTML =
            await chargerArticlesCommande(commande.id);

        const carte =
            document.createElement("article");

        carte.className = "admin-order";

        const statut = commande.status || "Nouvelle";

        carte.innerHTML = `
            <div class="admin-order-header">

                <div>
                    <span class="order-label">
                        COMMANDE
                    </span>

                    <h3>
                        #${echapperHTML(commande.id)}
                    </h3>
                </div>

                <div class="order-status-control">

                    <label for="status-${commande.id}">
                        Statut
                    </label>

                    <select
                        id="status-${commande.id}"
                        class="order-status-select"
                        data-order-id="${commande.id}"
                    >
                        <option value="Nouvelle"
                            ${statut === "Nouvelle" ? "selected" : ""}>
                            🆕 Nouvelle
                        </option>

                        <option value="En préparation"
                            ${statut === "En préparation" ? "selected" : ""}>
                            🔄 En préparation
                        </option>

                        <option value="En livraison"
                            ${statut === "En livraison" ? "selected" : ""}>
                            🚚 En livraison
                        </option>

                        <option value="Terminée"
                            ${statut === "Terminée" ? "selected" : ""}>
                            ✅ Terminée
                        </option>

                        <option value="Annulée"
                            ${statut === "Annulée" ? "selected" : ""}>
                            ❌ Annulée
                        </option>
                    </select>

                </div>

            </div>

            <div class="admin-order-client">

                <h4>👤 Client</h4>

                <p>
                    <strong>
                        ${echapperHTML(
                            commande.customer_name || ""
                        )}
                    </strong>
                </p>

                <p>
                    📞
                    ${echapperHTML(
                        commande.customer_phone || ""
                    )}
                </p>

                <p>
                    📍
                    ${echapperHTML(
                        commande.customer_address || ""
                    )}
                </p>

                <p>
                    🚚
                    ${echapperHTML(
                        commande.delivery_method || ""
                    )}
                </p>

            </div>

            <div class="admin-order-items">

                <h4>🧼 Produits commandés</h4>

                ${articleHTML}

            </div>

            <div class="admin-order-footer">

                <span>
                    📅 ${echapperHTML(
                        formaterDate(commande.created_at)
                    )}
                </span>

                <strong>
                    ${formaterNombre(commande.total)}
                    FCFA
                </strong>

            </div>
        `;

        container.appendChild(carte);
    }

    initialiserEvenementsStatut();
}

/* =========================================================
   23. COMMANDES — ARTICLES
========================================================= */

async function chargerArticlesCommande(orderId) {
    const { data: articles, error } =
        await supabaseClient
            .from("order_items")
            .select(`
                id,
                order_id,
                product_id,
                quantity,
                price,
                products (
                    name,
                    image_url
                )
            `)
            .eq("order_id", orderId);

    if (error) {
        console.error(
            "Erreur articles commande :",
            error
        );

        return `
            <p>
                Impossible de charger les articles.
            </p>
        `;
    }

    if (!articles?.length) {
        return `
            <p>
                Aucun article enregistré.
            </p>
        `;
    }

    return articles.map(function(article) {
        const nomProduit =
            article.products?.name ||
            "Produit #" + article.product_id;

        const quantite =
            Number(article.quantity || 0);

        const prix =
            Number(article.price || 0);

        const sousTotal =
            quantite * prix;

        return `
            <div class="order-item">

                <div>
                    <strong>
                        🧼
                        ${echapperHTML(nomProduit)}
                    </strong>

                    <span>
                        ${quantite} ×
                        ${formaterNombre(prix)}
                        FCFA
                    </span>
                </div>

                <strong>
                    ${formaterNombre(sousTotal)}
                    FCFA
                </strong>

            </div>
        `;
    }).join("");
}

/* =========================================================
   24. ACTUALISER COMMANDES
========================================================= */

if (refreshOrdersButton) {
    refreshOrdersButton.addEventListener(
        "click",
        async function() {
            refreshOrdersButton.disabled = true;
            refreshOrdersButton.textContent =
                "⏳ Chargement...";

            try {
                await chargerCommandes();
            } finally {
                refreshOrdersButton.disabled = false;
                refreshOrdersButton.textContent =
                    "🔄 Actualiser";
            }
        }
    );
}

/* =========================================================
   25. MODIFIER STATUT COMMANDE
========================================================= */

async function modifierStatutCommande(
    orderId,
    nouveauStatut
) {
    const { error } =
        await supabaseClient
            .from("orders")
            .update({
                status: nouveauStatut
            })
            .eq("id", Number(orderId));

    if (error) {
        console.error(
            "Erreur modification statut :",
            error
        );

        alert(
            "Impossible de modifier le statut : " +
            error.message
        );

        return false;
    }

    const commande =
        commandesAdmin.find(
            function(item) {
                return Number(item.id) === Number(orderId);
            }
        );

    if (commande) {
        commande.status = nouveauStatut;
    }

    return true;
}

function initialiserEvenementsStatut() {
    document
        .querySelectorAll(".order-status-select")
        .forEach(function(select) {
            if (select.dataset.bound === "true") {
                return;
            }

            select.dataset.bound = "true";

            select.addEventListener(
                "change",
                async function() {
                    const orderId =
                        Number(this.dataset.orderId);

                    const nouveauStatut =
                        this.value;

                    this.disabled = true;

                    const succes =
                        await modifierStatutCommande(
                            orderId,
                            nouveauStatut
                        );

                    this.disabled = false;

                    if (!succes) {
                        await chargerCommandes();
                    }
                }
            );
        });
}

/* =========================================================
   26. MENU EXPORT
========================================================= */

function fermerMenuExport() {
    if (exportOrdersMenu) {
        exportOrdersMenu.style.display = "none";
    }
}

if (exportOrdersButton && exportOrdersMenu) {
    exportOrdersButton.addEventListener(
        "click",
        function(event) {
            event.stopPropagation();

            exportOrdersMenu.style.display =
                exportOrdersMenu.style.display === "block"
                    ? "none"
                    : "block";
        }
    );

    exportOrdersMenu.addEventListener(
        "click",
        function(event) {
            event.stopPropagation();
        }
    );
}

document.addEventListener(
    "click",
    fermerMenuExport
);

/* =========================================================
   27. DONNEES D'EXPORT
========================================================= */

async function obtenirDonneesExport() {
    if (!commandesAdmin.length) {
        alert("Aucune commande à exporter.");
        return null;
    }

    const donnees = [];

    for (const commande of commandesAdmin) {
        const { data: articles, error } =
            await supabaseClient
                .from("order_items")
                .select(`
                    product_id,
                    quantity,
                    price,
                    products (
                        name
                    )
                `)
                .eq("order_id", commande.id);

        if (error) {
            console.error(
                "Erreur articles export :",
                error
            );

            /*
             * On n'abandonne pas tout l'export :
             * la commande reste exportable.
             */
        }

        const produitsCommande =
            (articles || []).map(
                function(article) {
                    const nom =
                        article.products?.name ||
                        "Produit #" +
                        article.product_id;

                    const quantite =
                        Number(article.quantity || 0);

                    const prix =
                        Number(article.price || 0);

                    return {
                        nom,
                        quantite,
                        prix,
                        sousTotal:
                            quantite * prix
                    };
                }
            );

        const listeProduits =
            produitsCommande
                .map(function(produit) {
                    return (
                        produit.nom +
                        " × " +
                        produit.quantite +
                        " (" +
                        formaterNombre(
                            produit.sousTotal
                        ) +
                        " FCFA)"
                    );
                })
                .join("\n");

        donnees.push({
            id: commande.id,
            date: formaterDate(
                commande.created_at
            ),
            client:
                commande.customer_name || "",
            telephone:
                commande.customer_phone || "",
            adresse:
                commande.customer_address || "",
            livraison:
                commande.delivery_method || "",
            produits: listeProduits,
            total:
                Number(commande.total || 0),
            statut:
                commande.status || ""
        });
    }

    return donnees;
}

/* =========================================================
   28. EXPORT EXCEL
========================================================= */

async function exporterCommandesExcel() {
    try {
        if (typeof XLSX === "undefined") {
            alert(
                "❌ La bibliothèque Excel n'est pas chargée."
            );
            return;
        }

        const donnees =
            await obtenirDonneesExport();

        if (!donnees) return;

        const lignes =
            donnees.map(function(commande) {
                return {
                    "N° Commande":
                        commande.id,
                    "Date":
                        commande.date,
                    "Client":
                        commande.client,
                    "Téléphone":
                        commande.telephone,
                    "Adresse":
                        commande.adresse,
                    "Livraison":
                        commande.livraison,
                    "Produits":
                        commande.produits,
                    "Total (FCFA)":
                        commande.total,
                    "Statut":
                        commande.statut
                };
            });

        const feuille =
            XLSX.utils.json_to_sheet(lignes);

        feuille["!cols"] = [
            { wch: 14 },
            { wch: 23 },
            { wch: 22 },
            { wch: 18 },
            { wch: 30 },
            { wch: 18 },
            { wch: 55 },
            { wch: 18 },
            { wch: 18 }
        ];

        const classeur =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            classeur,
            feuille,
            "Commandes"
        );

        XLSX.writeFile(
            classeur,
            "Wendkouni-commandes.xlsx"
        );

        fermerMenuExport();

    } catch (error) {
        console.error(
            "Erreur export Excel :",
            error
        );

        alert(
            "Erreur pendant l'export Excel : " +
            (error?.message || "Erreur inconnue")
        );
    }
}

/* =========================================================
   29. EXPORT PDF
========================================================= */

async function exporterCommandesPDF() {
    try {
        if (
            !window.jspdf ||
            typeof window.jspdf.jsPDF !== "function"
        ) {
            alert(
                "❌ La bibliothèque PDF n'est pas chargée."
            );
            return;
        }

        const donnees =
            await obtenirDonneesExport();

        if (!donnees) return;

        const jsPDF =
            window.jspdf.jsPDF;

        const doc =
            new jsPDF(
                "landscape",
                "mm",
                "a4"
            );

        const totalGeneral =
            donnees.reduce(
                function(total, commande) {
                    return total + commande.total;
                },
                0
            );

        doc.setFontSize(18);
        doc.text(
            "Wendkouni Savonnerie",
            14,
            15
        );

        doc.setFontSize(12);
        doc.text(
            "Rapport des commandes",
            14,
            23
        );

        doc.setFontSize(9);
        doc.text(
            "Date d'export : " +
            new Date().toLocaleString("fr-FR"),
            14,
            30
        );

        doc.text(
            "Nombre de commandes : " +
            donnees.length,
            14,
            36
        );

        doc.text(
            "Total général : " +
            formaterNombre(totalGeneral) +
            " FCFA",
            14,
            42
        );

        const lignes =
            donnees.map(function(commande) {
                return [
                    "#" + commande.id,
                    commande.date,
                    commande.client,
                    commande.telephone,
                    commande.livraison,
                    commande.produits,
                    formaterNombre(
                        commande.total
                    ) + " FCFA",
                    commande.statut
                ];
            });

        if (typeof doc.autoTable !== "function") {
            alert(
                "❌ Le module AutoTable PDF n'est pas chargé."
            );
            return;
        }

        doc.autoTable({
            startY: 48,
            head: [[
                "N°",
                "Date",
                "Client",
                "Téléphone",
                "Livraison",
                "Produits",
                "Total",
                "Statut"
            ]],
            body: lignes,
            styles: {
                fontSize: 7,
                cellPadding: 2,
                overflow: "linebreak"
            },
            headStyles: {
                fontSize: 7
            },
            columnStyles: {
                0: { cellWidth: 12 },
                1: { cellWidth: 30 },
                2: { cellWidth: 28 },
                3: { cellWidth: 25 },
                4: { cellWidth: 22 },
                5: { cellWidth: 70 },
                6: { cellWidth: 25 },
                7: { cellWidth: 25 }
            }
        });

        doc.save(
            "Wendkouni-commandes.pdf"
        );

        fermerMenuExport();

    } catch (error) {
        console.error(
            "Erreur export PDF :",
            error
        );

        alert(
            "Erreur pendant l'export PDF : " +
            (error?.message || "Erreur inconnue")
        );
    }
}

/* =========================================================
   30. EXPORT WORD
========================================================= */

async function exporterCommandesWord() {

    try {

        /* ================================
           VERIFICATION BIBLIOTHEQUE DOCX
        ================================= */

        if (
            typeof window.docx === "undefined"
        ) {
            alert(
                "❌ La bibliothèque Word n'est pas chargée."
            );
            return;
        }

        if (
            typeof window.docx.Document !== "function"
        ) {
            alert(
                "❌ La bibliothèque Word est incomplète."
            );
            return;
        }

        if (
            typeof window.docx.Packer !== "function"
        ) {
            alert(
                "❌ Le module Packer de Word n'est pas disponible."
            );
            return;
        }


        /* ================================
           DONNEES
        ================================= */

        const donnees =
            await obtenirDonneesExport();

        if (!donnees) {
            return;
        }


        /* ================================
           MODULES DOCX
        ================================= */

        const {
            Document,
            Packer,
            Paragraph,
            TextRun,
            Table,
            TableRow,
            TableCell,
            WidthType,
            HeadingLevel
        } = window.docx;


        /* ================================
           TOTAL
        ================================= */

        const totalGeneral =
            donnees.reduce(
                function(total, commande) {

                    return (
                        total +
                        Number(
                            commande.total || 0
                        )
                    );

                },
                0
            );


        /* ================================
           EN-TETE TABLEAU
        ================================= */

        const titres = [
            "Commande",
            "Date",
            "Client",
            "Téléphone",
            "Livraison",
            "Produits",
            "Total",
            "Statut"
        ];

        const lignesTableau = [

            new TableRow({

                children:
                    titres.map(
                        function(titre) {

                            return new TableCell({

                                children: [

                                    new Paragraph({

                                        children: [

                                            new TextRun({
                                                text: titre,
                                                bold: true
                                            })

                                        ]

                                    })

                                ]

                            });

                        }
                    )

            })

        ];


        /* ================================
           LIGNES COMMANDES
        ================================= */

        donnees.forEach(
            function(commande) {

                const valeurs = [

                    "#" + commande.id,

                    commande.date,

                    commande.client,

                    commande.telephone,

                    commande.livraison,

                    commande.produits,

                    formaterNombre(
                        commande.total
                    ) + " FCFA",

                    commande.statut

                ];


                lignesTableau.push(

                    new TableRow({

                        children:
                            valeurs.map(
                                function(valeur) {

                                    return new TableCell({

                                        children: [

                                            new Paragraph(
                                                String(
                                                    valeur ?? ""
                                                )
                                            )

                                        ]

                                    });

                                }
                            )

                    })

                );

            }
        );


        /* ================================
           TABLEAU
        ================================= */

        const tableau =
            new Table({

                width: {
                    size: 100,
                    type:
                        WidthType.PERCENTAGE
                },

                rows:
                    lignesTableau

            });


        /* ================================
           DOCUMENT
        ================================= */

        const documentWord =
            new Document({

                sections: [

                    {

                        children: [

                            new Paragraph({

                                text:
                                    "Wendkouni Savonnerie",

                                heading:
                                    HeadingLevel.TITLE

                            }),


                            new Paragraph({

                                children: [

                                    new TextRun({

                                        text:
                                            "Rapport des commandes",

                                        bold: true

                                    })

                                ]

                            }),


                            new Paragraph(

                                "Date d'export : " +
                                new Date()
                                    .toLocaleString(
                                        "fr-FR"
                                    )

                            ),


                            new Paragraph(

                                "Nombre de commandes : " +
                                donnees.length

                            ),


                            new Paragraph(

                                "Total général : " +
                                formaterNombre(
                                    totalGeneral
                                ) +
                                " FCFA"

                            ),


                            new Paragraph(""),


                            tableau

                        ]

                    }

                ]

            });


        /* ================================
           GENERATION DOCX
        ================================= */

        const blob =
            await Packer.toBlob(
                documentWord
            );


        /* ================================
           TELECHARGEMENT
        ================================= */

        const url =
            URL.createObjectURL(blob);

        const lien =
            document.createElement("a");

        lien.href = url;

        lien.download =
            "Wendkouni-commandes.docx";

        document.body.appendChild(lien);

        lien.click();

        lien.remove();


        setTimeout(
            function() {

                URL.revokeObjectURL(url);

            },
            1000
        );


        fermerMenuExport();


    } catch (error) {

        console.error(
            "Erreur export Word :",
            error
        );

        alert(
            "Erreur pendant l'export Word :\n" +
            (
                error?.message ||
                "Erreur inconnue"
            )
        );

    }

}
/* =========================================================
   31. EVENEMENTS EXPORT
========================================================= */

if (exportExcelButton) {
    exportExcelButton.addEventListener(
        "click",
        exporterCommandesExcel
    );
}

if (exportPdfButton) {
    exportPdfButton.addEventListener(
        "click",
        exporterCommandesPDF
    );
}

if (exportWordButton) {
    exportWordButton.addEventListener(
        "click",
        exporterCommandesWord
    );
}

/* =========================================================
   32. AUTH STATE
========================================================= */

supabaseClient.auth.onAuthStateChange(
    function(event) {
        debug("AUTH EVENT :", event);
    }
);

/* =========================================================
   33. DEMARRAGE
========================================================= */

debug("Démarrage de l'administration...");
verifierSession();
