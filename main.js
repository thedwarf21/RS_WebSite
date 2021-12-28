/**
 * - !!!! Le faire full responsive (==> au fur et à mesure)
 * 
 * - SEO
 * - Poster sur LinkedIn
 */


/***** Mise en place de l'animation d'apparition des sections *****/
const REVEAL_DELTA = 150;

/**
 * Parcourre les elements portant la classe "reveal" afin d'ajouter/supprimer la classe active, si nécessaire 
 * (classe active = entrée en bas de l'écran de ${REVEAL_DELTA} pixels)
 */
function reveal() {
    let revealElements = document.querySelectorAll(".reveal");
    for (let element of revealElements) {
        let elementTop = element.getBoundingClientRect().top;
        if (elementTop < window.innerHeight - REVEAL_DELTA)
            element.classList.add("active");
        else element.classList.remove("active");
    }
}
window.addEventListener("scroll", reveal);


/***** Controller *****/
class MainController {

    /**
     * Initialisation pré-chargement du DOM
     */
    static init() {
        document.currentController = MainController;    // Par défaut, la RS WCL traduit "scope" par "document.currentController.scope"
        MainController.scope = {                        // ---> la portée du binding est initialisée par le controller actif, au moment
            cursor_value: 2,                            //      où il le devient
            readonly_cursor_value: 1200
        };
    }

    /**
     * Initialisation post-chargement du DOM
     */
    static postLoadInit() {

        // Syncronisation de l'affichage de la valeur du curseur au sein du paragraphe de présentation
        new RS_Binding({
            object: document.currentController.scope,
            property: "cursor_value"
        }).addBinding(document.getElementById("cursor_value"), "innerHTML");
    }
}
