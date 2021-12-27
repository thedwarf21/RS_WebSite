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

/**
 * Il serait intéressant de gérer les dimensions des contenus affichés :
 * Le cube devrait s'afficher en conséquence 
 *   => reporter size sur height et width sur l'élément .rs-cube
 *     => translateZ à appliquer à cet élément = -1/2 size
 *   => translateZ des faces = 1/2 size
 *
 * Attention : translateZ se met dans transform qui reçoit également les rotate() => conflits
 */

// Constantes propres au composant
const CUBE_DEFAULT_SEQUENCE = ["front", "rear", "top", "left", "right", "bottom"];
const CUBE_DEFAULT_TEMPO = 5000;

//---------------------------------------------------------------------------------------------------
//                                  Affichage d'un cube animé
//---------------------------------------------------------------------------------------------------
/* Usage JS Uniquement */
class RS_Cube extends HTMLDivElement {

  /**
   * L'objet "contents" attendu en paramètre du constructeur doit être un objet ayant pour propriétés :
   *   - front
   *   - rear
   *   - left
   *   - right
   *   - top
   *   - bottom
   *
   * Ces propriétés doivent être initialisées avec le code HTML à injecter en contenu de la face concernée
   *
   * La liste "sequence" définit l'ordre d'affichage des faces (voir la constante CUBE_DEFAULT_SEQUENCE)
   */

  /************************************************************************
   * Crée un cube animé à partir d'un objet décrivant le contenu par face *
   ************************************************************************ 
   * @param | {Object} | contents | Contenus à afficher sur les faces     *
   * @param | {number} | tempo    | Temporisation pr défilement auto (ms) *
   * @param | {Array}  | sequence | Enchaînement des faces affichées      *
   ************************************************************************/
  constructor(contents, tempo, sequence) {
    
    // Création des bases structurelles du composant
    super();
    this.classList.add("rs-scene");

    // Propriétés de persistence des données
    this.sequence = sequence ? sequence : CUBE_DEFAULT_SEQUENCE;
    this.tempo = tempo ? tempo : CUBE_DEFAULT_TEMPO;
    this.shownSide = this.sequence[0];
    this.curSeqIdx = 0;

    // Contrôle de cohérence du paramètre "contents"
    if (Object.entries(contents).length == 6 
        && contents.hasOwnProperty("front") && contents.hasOwnProperty("rear")
        && contents.hasOwnProperty("left") && contents.hasOwnProperty("right") 
        && contents.hasOwnProperty("top") && contents.hasOwnProperty("bottom")) {

      // Création du cube en tant que tel (conteneur de faces)
      this.cubeElement = document.createElement("DIV");
      this.cubeElement.classList.add("rs-cube");
      this.appendChild(this.cubeElement);
    
      // Ajout des faces du cube par parcours de "contents"
      for (let [side, html_content] of Object.entries(contents))
        this.generateFace(side, html_content);
    } else console.error("L'objet de paramétrage des contenus est mal formé.", contents);

    // Mise en place du défilement automatique
    this.rotateCube(this.shownSide);
  }

  /**************************************************************************************
   * Génère une face du cube animé                                                      *
   **************************************************************************************
   * @param | {string} | side         | Côté du cube [front|rear|left|right|top|bottom] *
   * @param | {string} | html_content | Code HTML à injecter dans la face de cube       *
   **************************************************************************************/
  generateFace(side, html_content) {
    let face = document.createElement("DIV");
    face.classList.add("rs-face");
    face.classList.add(side);
    face.innerHTML = html_content;
    this.cubeElement.appendChild(face);
  }

  /*****************************************************************************************
   * Applique la rotation du cube pour afficher une face en particulier                    *
   *****************************************************************************************
   * @param | {string} | side | Face du cube à afficher [front|rear|left|right|top|bottom] *
   *****************************************************************************************/
  rotateCube(side) {
    if (["front", "rear", "left", "right", "top", "bottom"].includes(side)) {
      this.cubeElement.classList.remove(this.shownSide);
      this.cubeElement.classList.add(side);
      this.shownSide = side;
      setTimeout(()=> {
        this.curSeqIdx = this.curSeqIdx + 1 == this.sequence.length ? 0 : this.curSeqIdx + 1;
        this.rotateCube(this.sequence[this.curSeqIdx]);
      }, this.tempo);
    } else console.error("Face du cube non valide :", side);
  }
}
customElements.define('rs-wcl-cube', RS_Cube, { extends: 'div' });

/* Usage HTML uniquement */
class RSWCLCube extends HTMLBaseElement {

  /**
   * <rs-cube rs-timer="2000" rs-sequence="['front', 'rear']">
   *   <rs-content side="front"></rs-content>
   *   <rs-content side="rear"></rs-content>
   *   <rs-content side="left"></rs-content>
   *   <rs-content side="right"></rs-content>
   *   <rs-content side="top"></rs-content>
   *   <rs-content side="bottom"></rs-content>
   * </rs-cube>
   */

  /*******************************************************************
   * Constructeur: appeler simplement le constructeur de HTMLElement *
   *******************************************************************/
  constructor() { super(); }

  /*************************************************
   * S'exécute lors de l'ajout du composant au DOM *
   *************************************************/
  connectedCallback() { super.setup(); }

  /****************************************************************************
   * S'exécute lorsque les enfants sont prêts (RS_WCL.js --> HTMLBaseElement) *
   ****************************************************************************/
  childrenAvailableCallback() {

    // Lecture des attributs
    let tempo = this.getAttribute("rs-timer");
    let sequence = eval(this.getAttribute("rs-sequence")) || undefined;

    // Récupération des contenus et génération de l'objet correspondant
    let contents = {};
    let dom_contents = this.getElementsByTagName("rs-content");
    for (let content of dom_contents)
      contents[content.getAttribute("side")] = content.innerHTML;

    // Génération du shadow DOM
    let shadow = this.attachShadow({ mode: SHADOW_MODE });
    RS_WCL.styleShadow(shadow, 'rswcl_samples/rs_cube.css');
    RS_WCL.styleShadow(shadow, 'rswcl_samples/theme.css');
    shadow.appendChild(new RS_Cube(contents, tempo, sequence));
  }
}
customElements.define('rs-cube', RSWCLCube);
