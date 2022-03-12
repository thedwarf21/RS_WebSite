//---------------------------------------------------------------------------------------------------
//                   Champ de formulaire personnalisé affiché sous forme de curseur
//---------------------------------------------------------------------------------------------------
/* Usage JS Uniquement */
class RS_CursorInput extends HTMLDivElement {

  /**
   * Le composant représent un curseur utilisant une couleur de fond en dégradés sur 3 couleurs :
   *   - couleur de minimale (dans "minParams.color")
   *   - couleur de maximale (dans "maxParams.color")
   *   - couleur médiane ("midColor")
   *
   * "minParams" et "maxParams" contiennent chacun également une propriété "value"
   *
   * Le composant affiche également un libellé ("title") à gauche, et la valeur à droite
   * Si "value" définit la valeur d'initialisation, la valeur du composant dépendra ensuite
   * de la position du curseur et sera recalculée en temps réel.
   *
   * "id" représente l'identifiant associé au composant complet.
   *
   * "rs_model" permet une synchronisation avec un modèle objet.
   * Si celui-ci est renseigné, "value" est ignoré.
   *
   * "step" est la valeur du pas. Par défaut, cette valeur est de 0.01
   */

  /******************************************************************************
   * Génère un champ de type curseur                                            *
   ******************************************************************************
   * @param | {string}   | id          | ID du composant                        *
   * @param | {string}   | title       | Libellé du champ                       *
   * @param | {number}   | value       | Valeur d'initialisation                *
   * @param | {number}   | step        | Valeur du pas                          *
   * @param | {Object}   | minParams   | Valeur minimal et couleur associée     *
   * @param | {Object}   | maxParams   | Valeur maximale et couleur associée    *
   * @param | {string}   | midColor    | Couleur médiane (correction design)    *
   * @param | {string}   | rs_model    | Binding                                *
   * @param | {function} | onchange    | Code exécuté quand valeur modifiée     *
   * @param | {boolean}  | readonly    | Rend le curseur fixe                   *
   * @param | {boolean}  | txtUnite    | Unité de mesure (ex: €, %, ml)         *
   * @param | {string}   | handleColor | Couleur curseur ("#hexa" ou "[r,g,b]") *
   * @param | {boolean}  | reverse     | Afficher dans le sens décroissant      *
   ******************************************************************************/
  constructor(id, title, value, step, minParams, maxParams, midColor, rs_model, onchange, readonly, txtUnite, handleColor, reverse) {
    
    // Création des bases structurelles du composant (enveloppe + titre)
    super();
    this.classList.add("rs-cursor-container");
    if (reverse)
      this.classList.add("reverse");

    // Initialisation des propriétés
    this.cursorMousePosX = 0;
    this.step = step;
    this.vmin = parseFloat(minParams.value);
    this.vmax = parseFloat(maxParams.value);
    this.oldValue = value;
    this.readonly = readonly;
    this.handleColor = handleColor;
    this.reverse = reverse;
    
    // Mise en place des éléments dans l'enveloppe du composant
    let titre = document.createElement("DIV");
    titre.classList.add("rs-cursor-title");
    titre.innerHTML = title;
    this.appendChild(titre);
    this.cursorElement = this.getInkBarWithCursor(minParams.color, midColor, maxParams.color, rs_model, onchange);
    this.applyCssCursorPosition(value);
    this.createInputElement(id, readonly, txtUnite, value, rs_model);
  }

  /*****************************************************************************************
   * Génère et s'auto-injecte le champ de saisie pour la valeur et l'affichage de l'unité  *
   *****************************************************************************************
   * @param | {string}   | id          | ID du composant                                   *
   * @param | {number}   | value       | Valeur d'initialisation                           *
   * @param | {boolean}  | readonly    | Lecture seule                                     *
   * @param | {string}   | txtUnite    | Unité de mesure (ex: €, %, ml)                    *
   * @param | {string}   | rs_model    | Binding                                           *
   *****************************************************************************************/
  createInputElement(id, readonly, txtUnite, value, rs_model) {

    // Création du champ contenant la valeur
    this.inputElement = document.createElement("INPUT");
    this.inputElement.setAttribute("type", "number");
    this.inputElement.classList.add("rs-cursor-input-field");
    this.inputElement.id = id;
    if (readonly)
      this.inputElement.setAttribute("readonly", "true");
    this.appendChild(this.inputElement);

    // Création du span contenant le texte de l'unité de mesure
    let spanUnite = document.createElement("SPAN");
    spanUnite.classList.add("rs-txt-unit");
    spanUnite.innerHTML = txtUnite;
    this.appendChild(spanUnite);

    // Si le rs_model est renseigné, on initialise la valeur avec celle pointée par rs_model et on met en place le binding
    if (rs_model) {
      let [target_obj, property] = RS_Binding.getObjectAndPropertyNameFromModel(rs_model);
      value = target_obj[property];
      this.inputElement.value = value;

      RS_Binding.bindModel(rs_model, this.inputElement, "value", "change", null, ()=> { 
        this.setCursorPosition();
      });
    }

    // On ajoute le listener onchange APRES le binding, afin qu'il s'exécute quand la valeur est à jour
    this.inputElement.value = value;
    this.inputElement.addEventListener("change", ()=> { this.applyValue(rs_model, onchange); });
  }

  /*****************************************************************************************
   * Retourne le code CSS à appliquer à la propriété "background" de la poignée du curseur *
   *****************************************************************************************
   * @return {string}   Le CSS générant le dégradé à partir de la couleur paramétrée       *
   *****************************************************************************************/
  getCustomCursorGradientColor() {
    let base_color;

    // Couleurs héxadécimales
    if (this.handleColor.startsWith("#")) {

      // Transformation de #RGB en #RRGGBB, si niveaux primaires sur 4 bits (un seul digit)
      if (this.handleColor.length == 4) {
        base_color = "#";
        for (let i=1; i<this.handleColor.length; i++) {
          let curChar = this.handleColor.charAt(i);
          base_color += curChar + curChar;
        }
      } else base_color = this.handleColor;
      return `linear-gradient(to right, transparent, ${base_color}60 40%, ${base_color} 50%, ${base_color}60 60%, transparent)`;
    } else {

      // Liste [r, g, b] => contrôle du format dans getRgbList()
      let color_array = this.getRgbList();
      if (color_array) {
        let rgb_params_string = color_array[0] + "," + color_array[1] + "," + color_array[2];
        return `linear-gradient(to right, transparent, rgba(${rgb_params_string}, 37.65%) 40%, rgb(${rgb_params_string}) 50%, rgba(${rgb_params_string}, 37.65%) 60%, transparent)`;
      }
    }
  }

  /**********************************************************************************************************
   * Contrôle la cohérence de la valeur et affiche un message d'erreur dans la console, en cas de problème. *
   * Retourne le [] de 3 valeurs                                                                            *
   **********************************************************************************************************
   * @return {boolean | Array}        false en cas d'erreur, sinon la liste des 3 valeurs [r, g, b]         *
   **********************************************************************************************************/
  getRgbList() {
    let base_color_levels = eval(this.handleColor);
    if (!Array.isArray(base_color_levels))
      console.error("Format incorrect pour handle-color.\n" +
                    "Formats autorisés:\n" +
                    "  - #code_couleur_hexa (ex: #000 ou #a3F8c2)" +
                    "  - [rouge, vert, bleu] (ex: [255, 255, 255])");
    else if (!base_color_levels.length == 3)
      console.error("Format incorrect pour handle-color.\n" +
                    "La liste RGB attend les niveaux de rouge, de vert et de bleu, dans un []");
    else if (base_color_levels[0] < 0 || base_color_levels[0] > 255 ||
             base_color_levels[1] < 0 || base_color_levels[1] > 255 ||
             base_color_levels[2] < 0 || base_color_levels[2] > 255)
      console.error("Format incorrect pour handle-color.\n" +
                    "Les niveaux de rouge, de vert et de bleu, doivent être compris entre 0 et 255");
    else return base_color_levels;
    return false;
  }

  /*************************************************************************************
   * Met à jour la largeur de l'élément curseur pour positionner la poignée            *
   *************************************************************************************
   * @param  {number}  | value      | La valeur pour laquelle calculer la position     *
   *************************************************************************************/
  applyCssCursorPosition(value) {

    // Cette valeur est stockée dans une propriété, pour les besoins du drag & drop
    this.currentCursorPercentValue = (value - this.vmin) / (this.vmax - this.vmin) * 100;
    let width_percent = 100 - this.currentCursorPercentValue;
    let decalage_vw = (50 - width_percent) / 50;
    this.cursorElement.style.width = `calc(${width_percent}% + ${decalage_vw}vw)`;
  }

  /***************************************************************************************************
   * Positionne le curseur en fonction de la valeur de l'input et des valeurs minimales et maximales *
   ***************************************************************************************************/
  setCursorPosition() {
    let value = this.inputElement.value;
    
    // Gestion des dépassements de valeurs min ou max
    if (value > this.vmax) {
      value = this.vmax;
      if (!this.cursorElement.classList.contains("error"))
        this.cursorElement.classList.add("error");
    } else if (value < this.vmin) {
      value = this.vmin
      if (!this.cursorElement.classList.contains("error"))
        this.cursorElement.classList.add("error");
    } else if (this.cursorElement.classList.contains("error"))
      this.cursorElement.classList.remove("error");

    // Application de position du curseur
    this.applyCssCursorPosition(value);
  }

  /**********************************************************************
   * Génère la barre colorée ainsi que son curseur et l'injecte         *
   **********************************************************************
   * @param | {string} | minColor | Couleur de la valeur minimale (CSS) *
   * @param | {string} | midColor | Couleur médiane (injection CSS)     *
   * @param | {string} | maxColor | Couleur de la valeur maximale (CSS) *
   * @param | {string} | rs_model | Binding                             *
   * @param | {string} | onchange | Code exécuté quand valeur modifiée  *
   **********************************************************************/
  getInkBarWithCursor(minColor, midColor, maxColor, rs_model, onchange) {

    // Obtention de la base graphique du curseur (barre au fond dégradé, butées, valeurs de butée)
    let graphical_base = this.getCursorGraphicalBase(minColor, midColor, maxColor);
    let shadow_wrapper = graphical_base[0];
    let barre = graphical_base[1];

    // Si le composant n'est pas en lecture seule, on met en place un événement onclick
    // Calculant la valeur correspondant à la position du clic
    if (!this.readonly) {
      barre.addEventListener('click', (evt)=> {
        let pos_x_click = evt.clientX - barre.getBoundingClientRect().left;
        let ratio_click = pos_x_click / barre.clientWidth * 100;
        this.applyPositionRatio(ratio_click);
        this.applyValue(rs_model, onchange);
      });
    }

    // On injecte le composant complet dans le DOM de "this"
    let cursor = this.getCursorHandle(rs_model, onchange);
    barre.appendChild(cursor);
    this.appendChild(shadow_wrapper);
    return cursor;
  }

  /**************************************************************************
   * Retourne le wrapper contenant le composant graphique, dans son entier, *
   * ainsi que la référence à la barre en fond dégradé paramétrable         *
   **************************************************************************
   * @param      {<type>} | minColor | La couleur de valeur minimale        *
   * @param      {<type>} | midColor | La couleur de valeur intermédiaire   *
   * @param      {<type>} | maxColor | La couleur de valeur maximale        *
   **************************************************************************
   * @return     {Array}               [wrapper, barre_colorée]             *
   **************************************************************************/
  getCursorGraphicalBase(minColor, midColor, maxColor) {

    // Création de la barre colorée
    let barre = document.createElement("DIV");
    barre.classList.add("rs-cursor-ink");
    let sens_degrade = this.reverse ? "left" : "right";
    barre.style.background = `linear-gradient(to ${sens_degrade},  ${minColor} 0%, ${midColor} 50%, ${maxColor} 100%)`;

    // Création des butées du curseur
    let limits_div = document.createElement("DIV");
    limits_div.classList.add("rs-cursor-limits");
    let limit_bar = document.createElement("DIV");
    limit_bar.classList.add("vertical-bar");
    limits_div.appendChild(limit_bar);
    limits_div.appendChild(limit_bar.cloneNode());

    // Affichage des valeurs de butée
    let limit_vals_div = document.createElement("DIV");
    limit_vals_div.classList.add("rs-cursor-limits");
    limit_vals_div.classList.add("vals");
    let min_val_elt = document.createElement("DIV");
    min_val_elt.classList.add("limit-val");
    let max_val_elt = min_val_elt.cloneNode();
    min_val_elt.innerHTML = this.reverse ? this.vmax : this.vmin;
    max_val_elt.innerHTML = this.reverse ? this.vmin : this.vmax;
    limit_vals_div.appendChild(min_val_elt);
    limit_vals_div.appendChild(max_val_elt);

    // On retourne les références au wrapper et à la barre en fond dégradé
    let wrapper = document.createElement("DIV");
    wrapper.classList.add("rs-shadow-wrapper");
    wrapper.appendChild(barre);
    wrapper.appendChild(limits_div);
    wrapper.appendChild(limit_vals_div);
    return [wrapper, barre];
  }

  /**********************************************************************
   * Retourne la poignée du curseur                                     *
   **********************************************************************
   * @param | {string} | rs_model | Binding                             *
   * @param | {string} | onchange | Code exécuté quand valeur modifiée  *
   **********************************************************************
   * @return  {HtmlElement}         La poignée de curseur               *
   **********************************************************************/
  getCursorHandle(rs_model, onchange) {

    // Création du curseur et de sa poignée
    let cursor = document.createElement("DIV");
    cursor.classList.add("rs-cursor");

    // Poignée de curseur
    let cursor_handle = document.createElement("DIV");
    cursor_handle.classList.add("rs-cursor-handle");
    cursor_handle.innerHTML = "X";
    
    // Couleur personnalisée pour le curseur
    if (this.handleColor)
      cursor_handle.style.background = this.getCustomCursorGradientColor();

    // Gestion du paramètre "readonly"
    if (!this.readonly)
      cursor_handle.onmousedown = (event)=> { this.cursorDragStart(event, rs_model, onchange); };
    else cursor.classList.add("readonly");

    // On retourne l'élément de DOM correspondant à la poignée du curseur
    cursor.appendChild(cursor_handle);
    return cursor;
  }

  /**************************************************************************************
   * Applique la valeur au modèle (si nécessaire), et lance le onchange (si nécessaire) *
   **************************************************************************************
   * @param | {string}   | rs_model | Binding                                           *
   * @param | {function} | onchange | À exécuter si définie                             *
   **************************************************************************************/
  applyValue(rs_model, onchange) {
    let newValue = parseFloat(this.inputElement.value);

    // On effectue un contrôle: la valeur doit être dans le pas défini => si pas=2 et valeur=3 => X
    if (newValue % this.step == 0) {
      if (rs_model) {
        let [target, property] = RS_Binding.getObjectAndPropertyNameFromModel(rs_model);
        target[property] = newValue;
      }
      
      if (onchange)
        onchange(newValue);

      this.setCursorPosition();
      this.oldValue = newValue;
    } else this.inputElement.value = this.oldValue;
  }

  /******************************************************************************
   * Applique un ratio de position en pourcentage, à la valeur et à l'affichage *
   ******************************************************************************
   * @param | {number} | pourcent | Ratio de position en pourcentage            *
   ******************************************************************************/
  applyPositionRatio(pourcent) {

    // Gestion du mode reverse
    if (this.reverse) 
      pourcent = 100 - pourcent;

    // Application de la valeur correcte la plus proche (selon le pas paramétré)
    let valeur = this.vmin + (pourcent * (this.vmax - this.vmin)) / 100;
    if (this.step > 0.01) {
      let division_entiere = Math.round(valeur / this.step);
      valeur = this.step * division_entiere;
    }
    valeur = RS_WCL.roundDec(valeur, 2);

    // Application de la valeur valide ainsi obtenue dans l'interface (champ de saisie et curseur)
    this.inputElement.value = valeur;
    this.applyCssCursorPosition(valeur);
  }

  /*******************************************************
   * Méthode invoquée lorsque l'on clique sur le curseur *
   * Initialise "this.cursorMousePosX" et met en place   *
   * les listeners sur la fenêtre.                       *
   *-----------------------------------------------------*
   * On modifie le curseur de la souris pour tout le     *
   * document, tant qu'on est en action sur le curseur   *
   * du composant.                                       *
   *-----------------------------------------------------*
   * Le "onchange" et le "rs_model" interviennent dans   *
   * l'événement "onmouseup".                            *
   *******************************************************/
  cursorDragStart(event, rs_model, onchange) {

    // Pour les évenements, on utilise un ()=> pour conserver un pointeur "this" sur notre composant
    let body = document.getElementsByTagName("BODY")[0];
    window.onmousemove = (event)=> { this.cursorDrag(event); };
    window.onmouseup = (event) => { this.cursorDragEnd(event, rs_model, onchange); };
    body.style.cursor = "col-resize";
    this.cursorMousePosX = event.clientX;

    // Le curseur n'est plus en erreur, dès lors que le drag and drop à commencé
    if (this.cursorElement.classList.contains("error"))
      this.cursorElement.classList.remove("error");
  }

  /*******************************************************
   * Méthode invoquée durant le déplacement du curseur   *
   *******************************************************/
  cursorDrag(event) {

    // Calcul du deltaX et enregistrement de la nouvelle position du curseur de souris
    let delta = event.clientX - this.cursorMousePosX;
    this.cursorMousePosX = event.clientX;

    // Calcul du nouveau pourcentage et de la nouvelle valeur
    let barre = this.cursorElement.parentNode;
    let useWidth = barre.clientWidth;
    let delta_pourcent = delta / useWidth * 100;
    let pourcent = this.reverse
                 ? this.currentCursorPercentValue - delta_pourcent
                 : this.currentCursorPercentValue + delta_pourcent;
    if (pourcent < 0) pourcent = 0;
    if (pourcent > 100) pourcent = 100;
    
    // Application nouvelle position du curseur
    let valeur = this.vmin + (pourcent * (this.vmax - this.vmin)) / 100;
    this.inputElement.value = valeur;
    this.applyCssCursorPosition(valeur);
  }

  /****************************************************************
   * Méthode invoquée lorsque l'on relâche le bouton de la souris *
   ****************************************************************
   * @param | {Object} | event | L'événement déclencheur          *
   ****************************************************************/
  cursorDragEnd(event, rs_model, onchange) { 

    // Retirons nos EventListeners et rétablissons le curseur par défaut
    window.onmousemove = null;
    window.onmouseup = null;
    document.getElementsByTagName("BODY")[0].style.cursor = "default";

    // Gestion du mode reverse
    let value = this.reverse
              ? 100 - this.currentCursorPercentValue
              : this.currentCursorPercentValue;

    // Application de la valeur définitive
    this.applyPositionRatio(value);
    this.applyValue(rs_model, onchange);
  }
}
customElements.define('rs-wcl-cursor-input', RS_CursorInput, { extends: 'div' });

/* Usage HTML uniquement */
class RSWCLCursorInput extends HTMLElement {

  /*******************************************************************
   * Constructeur: appeler simplement le constructeur de HTMLElement *
   *******************************************************************/
  constructor() { super(); }

  /*************************************************
   * S'exécute lors de l'ajout du composant au DOM *
   *************************************************/
  connectedCallback() {
    let shadow = this.attachShadow({ mode: SHADOW_MODE });
    let id = this.getAttribute("id");
    let title = this.getAttribute("titre");
    let value = this.getAttribute("init-value");
    let minParams = {
      value: this.getAttribute("min-value"),
      color: this.getAttribute("min-color")
    };
    let maxParams = {
      value: this.getAttribute("max-value"),
      color: this.getAttribute("max-color")
    };
    let midColor = this.getAttribute("mid-color");
    let step = parseFloat(this.getAttribute("step")) || 0.01;
    let rs_model = this.getAttribute("rs-model");
    let txtUnite = this.getAttribute("txt-unit") || "";
    let readonly = eval(this.getAttribute("rs-readonly")) || false;
    let onchange = (value)=> {
      eval(this.getAttribute("onchange"));
    };
    let handleColor = this.getAttribute("handle-color");
    let reverse = this.getAttribute("reverse");
    RS_WCL.styleShadow(shadow, 'rswcl_samples/rs_cursor_input.css');
    shadow.appendChild(new RS_CursorInput(id, title, value, step, minParams, maxParams, midColor, rs_model, onchange, readonly, txtUnite, handleColor, reverse));
  }
}
customElements.define('rs-cursor-input', RSWCLCursorInput);
