/*
  Copyright © 10/02/2020, Roquefort Softwares Web Components Library

  Permission is hereby granted, free of charge, to any person obtaining a copy of this Library and associated 
  documentation files (the “Software”), to deal in the Software without restriction, including without limitation 
  the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, 
  and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  The Software is provided “as is”, without warranty of any kind, express or implied, including but not limited to 
  the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event shall the 
  authors or copyright holders Roquefort Softwares be liable for any claim, damages or other liability, whether in 
  an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or 
  other dealings in the Software.
  
  Except as contained in this notice, the name of the Roquefort Softwares Web Components Library shall not be used 
  in advertising or otherwise to promote the sale, use or other dealings in this Software without prior written 
  authorization from Roquefort Softwares.
*/

// Constante spécifique à ce composant
const CURSOR_WIDTH = 30;

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

  /*************************************************************************
   * Génère un champ de type curseur                                       *
   *************************************************************************
   * @param | {string}   | id        | ID du composant                     *
   * @param | {string}   | title     | Libellé du champ                    *
   * @param | {number}   | value     | Valeur d'initialisation             *
   * @param | {number}   | step      | Valeur du pas                       *
   * @param | {Object}   | minParams | Valeur minimal et couleur associée  *
   * @param | {Object}   | maxParams | Valeur maximale et couleur associée *
   * @param | {string}   | midColor  | Couleur médiane (correction design) *
   * @param | {string}   | rs_model  | Binding                             *
   * @param | {function} | onchange  | Code exécuté quand valeur modifiée  *
   * @param | {boolean}  | readonly  | Rend le curseur fixe                *
   * @param | {boolean}  | txtUnite  | Unité de mesure (ex: €, %, ml)      *
   *************************************************************************/
  constructor(id, title, value, step, minParams, maxParams, midColor, rs_model, onchange, readonly, txtUnite) {
    
    // Création des bases structurelles du composant (enveloppe + titre)
    super();
    this.classList.add("rs-cursor-container");
    let titre = document.createElement("DIV");
    titre.classList.add("rs-cursor-title");
    titre.innerHTML = title;

    // Création du champ contenant la valeur
    this.inputElement = document.createElement("INPUT");
    this.inputElement.setAttribute("type", "number");
    this.inputElement.classList.add("rs-cursor-input-field");
    this.inputElement.id = id;
    if (readonly)
      this.inputElement.setAttribute("readonly", "true");

    // Création du span contenant le texte de l'unité de mesure
    let spanUnite = document.createElement("SPAN");
    spanUnite.classList.add("rs-txt-unit");
    spanUnite.innerHTML = txtUnite;

    // Initialisation des propriétés
    this.cursorMousePosX = 0;
    this.step = step;
    this.vmin = parseFloat(minParams.value);
    this.vmax = parseFloat(maxParams.value);
    this.oldValue = value;
    this.readonly = readonly;

    // Si le rs_model est renseigné, on initialise la valeur avec celle pointée par rs_model
    if (rs_model){
      let [target_obj, property] = RS_Binding.getObjectAndPropertyNameFromModel(rs_model);
      value = target_obj[property];
    }    
    
    // Mise en place des éléments dans l'enveloppe du composant
    this.appendChild(titre);
    this.cursorElement = this.getInkBarWithCursor(value, minParams.color, midColor, maxParams.color, rs_model, onchange);
    this.appendChild(this.inputElement);
    this.inputElement.value = value;      // Si on le fait avant, la valeur ne s'affiche pas
    this.appendChild(spanUnite);

    // On ajoute le listener onchange APRES le binding, afin qu'il s'exécute quand la valeur est à jour
    this.inputElement.addEventListener("change", ()=> { this.applyValue(rs_model, onchange) });
  }

  /***************************************************************************************************
   * Positionne le curseur en fonction de la valeur de l'input et des valeurs minimales et maximales *
   ***************************************************************************************************/
  setCursorPosition() {
    let value = this.inputElement.value;
    let pourcent = (value - this.vmin) / (this.vmax - this.vmin) * 100;

    // Gestion des dépassements de valeurs min ou max
    if (pourcent > 100) {
      pourcent = 100;
      if (!this.cursorElement.classList.contains("error"))
        this.cursorElement.classList.add("error");
    } else if (pourcent < 0) {
      pourcent = 0
      if (!this.cursorElement.classList.contains("error"))
        this.cursorElement.classList.add("error");
    } else if (this.cursorElement.classList.contains("error"))
      this.cursorElement.classList.remove("error");

    // Application de position du curseur
    this.cursorElement.style.left = `calc(${pourcent}% - ${CURSOR_WIDTH / 2}px)`;
  }

  /**********************************************************************
   * Génère la barre colorée ainsi que son curseur et l'injecte         *
   **********************************************************************
   * @param | {number} | value    | Valeur initiale                     *
   * @param | {string} | minColor | Couleur de la valeur minimale (CSS) *
   * @param | {string} | midColor | Couleur médiane (injection CSS)     *
   * @param | {string} | maxColor | Couleur de la valeur maximale (CSS) *
   * @param | {string} | rs_model | Binding                             *
   * @param | {string} | onchange | Code exécuté quand valeur modifiée  *
   **********************************************************************/
  getInkBarWithCursor(value, minColor, midColor, maxColor, rs_model, onchange) {

    // Création de la barre colorée
    let barre = document.createElement("DIV");
    barre.classList.add("rs-cursor-ink");
    barre.style.background = `linear-gradient(to right,  ${minColor} 0%, ${midColor} 50%, ${maxColor} 100%)`;

    // Si le composant n'est pas en lecture seule, on met en place un événement onclick
    // Calculant la valeur correspondant à la position
    if (!this.readonly) {
      barre.addEventListener('click', (evt)=> {
        let pos_x_click = evt.clientX - barre.getBoundingClientRect().left;
        let ratio_click = pos_x_click / barre.clientWidth * 100;
        this.applyPositionRatio(ratio_click);
        this.applyValue(rs_model, onchange);
      });
    }

    // Création du curseur (positionnement en fct de value, minParams.value et maxParams.value)
    let cursor = document.createElement("DIV");
    cursor.classList.add("rs-cursor");
    cursor.style.left = `calc(${(value - this.vmin) / (this.vmax - this.vmin) * 100}% - ${CURSOR_WIDTH / 2}px)`;
    if (!this.readonly)
      cursor.onmousedown = (event)=> { this.cursorDragStart(event, rs_model, onchange); };
    else cursor.classList.add("readonly");

    // On injecte le composant complet dans le DOM de "this"
    barre.appendChild(cursor);
    this.appendChild(barre);
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
    let valeur = this.vmin + (pourcent * (this.vmax - this.vmin)) / 100;
    if (this.step > 0.01) {
      let division_entiere = Math.round(valeur / this.step);
      valeur = this.step * division_entiere;
    }
    valeur = RS_WCL.roundDec(valeur, 2);
    this.inputElement.value = valeur;
    this.cursorElement.style.left = `calc(${pourcent}% - ${CURSOR_WIDTH / 2}px)`;
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
    window.onmouseup = (event) => { 
      this.cursorDragEnd(event);
      this.applyValue(rs_model, onchange);
    };
    body.style.cursor = "pointer";
    this.cursorMousePosX = event.clientX;
  }

  /*******************************************************
   * Méthode invoquée durant le déplacement du curseur   *
   *******************************************************/
  cursorDrag(event) {

    // Calcul du nouveau pourcentage et de la nouvelle valeur
    let barre = this.cursorElement.parentNode;
    let delta = event.clientX - this.cursorMousePosX;
    let useWidth = barre.clientWidth - barre.clientHeight;
    let delta_pourcent = delta / useWidth * 100;
    let pourcent_actuel = parseFloat(this.cursorElement.style.left.substring(5).split("%")[0]);
    let pourcent = pourcent_actuel + delta_pourcent;
    if (pourcent < 0) pourcent = 0;
    if (pourcent > 100) pourcent = 100;
    
    // Application des nouvelles données
    this.cursorMousePosX = event.clientX;
    this.applyPositionRatio(pourcent);
  }

  /****************************************************************
   * Méthode invoquée lorsque l'on relâche le bouton de la souris *
   *   1/ On supprime les événement placés sur la fenêtre         *
   *   2/ Le curseur souris revient à la normale                  *
   ****************************************************************
   * @param | {Object} | event | L'événement déclencheur          *
   ****************************************************************/
  cursorDragEnd(event) { 
    window.onmousemove = null;
    window.onmouseup = null;
    document.getElementsByTagName("BODY")[0].style.cursor = "default";
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
    RS_WCL.styleShadow(shadow, 'rswcl_samples/rs_cursor_input.css');
    RS_WCL.styleShadow(shadow, 'rswcl_samples/theme.css');
    shadow.appendChild(new RS_CursorInput(id, title, value, step, minParams, maxParams, midColor, rs_model, onchange, readonly, txtUnite));
  }
}
customElements.define('rs-cursor-input', RSWCLCursorInput);
