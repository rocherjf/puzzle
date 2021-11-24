// configuration
let config = ({
    urlPuzzle: 'images/puzzles/small_puzzle.jpg', // 35 pieces
    // urlPuzzle: 'images/puzzles/road-autumn.jpg', // 897 pieces
    urlCanvasBackground: '/images/fond_bois-xlarge.jpeg',
    tileWidth: 50, // TODO : Remplacer valeur en dur par valeur calculée !!
    margeErreur: 10 // TODO : supp mod debug
});

let puzzle;

let tailleCanvas = {
    width: 0.9 * window.innerWidth,
    height: 0.9 * window.innerHeight
};


let canvas = this.__canvas = new fabric.Canvas('zone-de-jeu', {
    hoverCursor: 'pointer',
    selection: false,
    targetFindTolerance: 2 // >TODO : tester augmenter
});
canvas.setWidth(tailleCanvas.width);
canvas.setHeight(tailleCanvas.height);

class Piece extends fabric.Image {

    constructor(image, mask, puzzle, positionPiece) {
        super(image._originalElement);

        let x = positionPiece.x;
        let y = positionPiece.y;

        this.cropX = mask.__left; // debut X
        this.cropY = mask.__top; // debut Y

        this.width = mask.width; // longeur X
        this.height = mask.height; // longeur Y

        this.clipPath = mask;

        this.top = mask.__top;
        this.left = mask.__left;

        this.__indX = x; // positionnement de la piece dans le tableau 2D du puzzle (colonne X)
        this.__indY = y; // positionnement de la piece dans le tableau 2D du puzzle (ligne y)

        this.__posX = mask.__left; // positionnement X de la piece dans la zone du puzzle terminé
        this.__posY = mask.__top; // positionnement Y de la piece dans la zone du puzzle terminé

        this.__positionPiece = x + y * puzzle.tilesPerRow;

        // info sur les voisins à trouver
        this.__aCompleterBas = y !== puzzle.tilesPerColumn - 1;
        this.__aCompleterHaut = y !== 0;
        this.__aCompleterGauche = x !== 0;
        this.__aCompleterDroite = x !== puzzle.tilesPerRow - 1;

        this.hasControls = false;
        this.hasBorders = false;
        this.perPixelTargetFind = true // selectionneable uniquement si on clique sur l'objet et non sur le rectangle contenant l'objet
    }

    getGroupe() {
        return this.__groupe;
    }

    besoinTraiterVoisinHaut() {
        return this.__aCompleterHaut;
    }

    besoinTraiterVoisinBas() {
        return this.__aCompleterBas;
    }

    besoinTraiterVoisinGauche() {
        return this.__aCompleterGauche;
    }

    besoinTraiterVoisinDroite() {
        return this.__aCompleterDroite;
    }

}

class Puzzle {

    constructor(img) {
        this.imgWidth = img.width;
        this.imgHeight = img.height;
        this.puzzleImage = img;
        this.tileWidth = config.tileWidth;
        this.tilesPerRow = Math.ceil(this.imgWidth / this.tileWidth);
        this.tilesPerColumn = Math.ceil(this.imgHeight / this.tileWidth);
        this.tiles = this.#constructionDesPiecesDuPuzzle();

    }

    /**
     * Permet de récupérer la pièce du puzzle correspondant à la position fournit
     * @param {Number} position 
     * @returns {fabric.Image}
     */
    getPiecePuzzle(position) {
        return this.tiles[position];
    }


    /**
     * Permet de modifier les groupes du puzzle si les positions entre 
     *  - deux pièces sont proche
     *  - une pièce et un groupe sont proche
     *  - deux groupes sont proche
     * 
     * @param {*} pieceOuGroupe 
     * @returns {Boolean} indicateur de modification des groupes de pièces contenues puzzle
     */
    siProcheVoisinRapprocherEtGrouperLesPieces(pieceOuGroupe) {

        let modifPuzzle = false;
        if (this.#isGroupe(pieceOuGroupe)) {
            modifPuzzle = pieceOuGroupe.getObjects().some(piece => {
                this.#siProcheVoisinHautGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(piece);
                this.#siProcheVoisinBasGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(piece);
                this.#siProcheVoisinGaucheGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(piece);
                this.#siProcheVoisinDroiteGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(piece);
            });
        } else {
            modifPuzzle = modifPuzzle || this.#siProcheVoisinHautGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(pieceOuGroupe);
            modifPuzzle = modifPuzzle || this.#siProcheVoisinBasGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(pieceOuGroupe);
            modifPuzzle = modifPuzzle || this.#siProcheVoisinGaucheGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(pieceOuGroupe);
            modifPuzzle = modifPuzzle || this.#siProcheVoisinDroiteGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(pieceOuGroupe);
        }
        return modifPuzzle;
    }


    #recupererVoisinHaut(piece) {
        let positionVoisinHaut = piece.__positionPiece - this.tilesPerRow;
        return this.getPiecePuzzle(positionVoisinHaut);
    }

    #recupererVoisinBas(piece) {
        let positionVoisinBas = piece.__positionPiece + this.tilesPerRow;
        return this.getPiecePuzzle(positionVoisinBas);
    }

    #recupererVoisinGauche(piece) {
        let positionVoisinGauche = piece.__positionPiece - 1;
        return this.getPiecePuzzle(positionVoisinGauche);
    }

    #recupererVoisinDroite(piece) {
        let positionVoisinDroite = piece.__positionPiece + 1;
        return this.getPiecePuzzle(positionVoisinDroite);
    }


    /**
     * La construction des pièces du puzzle se faire à l'aide des champs tilesPerRow, tilesPerColumn et puzzleImage de l'objet Puzzle
     * @returns {Array} les pièces du puzzle
     */
    #constructionDesPiecesDuPuzzle() {

        let nbPiecesParLigne = this.tilesPerRow;
        let nbPiecesParColonnes = this.tilesPerColumn

        let tiles = new Array();
        let tileRatio = this.tileWidth / 100.0;

        let formeDesPieces = this.#getFormeDesPiecesDuPuzzle(nbPiecesParLigne, nbPiecesParColonnes);

        for (let y = 0; y < nbPiecesParColonnes; y++) {
            for (let x = 0; x < nbPiecesParLigne; x++) {

                let formeDeLaPiece = formeDesPieces[y * nbPiecesParLigne + x];

                let mask = this.#createOneTileMask(tileRatio, formeDeLaPiece, {
                    x: x * this.tileWidth,
                    y: y * this.tileWidth
                });

                mask.set({
                    __top: mask.top,
                    __left: mask.left,
                    top: -mask.height / 2,
                    left: -mask.width / 2,
                });

                let image = new Piece(this.puzzleImage, mask, this, {
                    x: x,
                    y: y
                });

                tiles.push(image);
            }
        }
        return tiles;
    }

    /**
     * Permet de construire une liste d'objet contenant les champs topTab, rightTab, bottomTab, leftTab
     * ces derniers correspondent chacun à un côté d'une pièce de puzzle
     * ce coté peut être plat (0), creusé (-1), en extension (+1)
     * @param {Number} width 
     * @param {Number} height 
     * @returns {Array}
     */
    #getFormeDesPiecesDuPuzzle(width, height) {

        // tableau à 1 dimension contenant les pièces du puzzle
        let shapeArray = new Array();

        // Renseigner les côtés non random (les pièces présentes en bordure du puzzle)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {

                // Récupération de la pièce du dessus et de la pièce de gauche si elles existent
                let pieceAuDessus = (y > 0) ? shapeArray[(y - 1) * width + x] : undefined;
                let pieceAGauche = (x > 0) ? shapeArray[y * width + x - 1] : undefined;

                // La création de la forme d'une pièce de puzzle obéit à plusieurs règles
                // * si le bord d'une pièce est aussi une bordure du puzzle
                //   --> alors ce bord à une valeure de 0
                // * le bord haut dépend du bord bas de la pièce du dessus
                // * le bord droit est déterminé aléatoirement
                // * le bord bas est déterminé aléatoirement
                // * le bord gauche dépend du bord droit de la pièce de droite
                let shape = {
                    topTab: y == 0 ? 0 : -pieceAuDessus.bottomTab,
                    rightTab: x == width - 1 ? 0 : this.#renvoiUnOuMoinsUn(),
                    bottomTab: y == height - 1 ? 0 : this.#renvoiUnOuMoinsUn(),
                    leftTab: x == 0 ? 0 : -pieceAGauche.rightTab
                };

                shapeArray.push(shape);
            }
        }
        return shapeArray;
    }

    /**
     * 
     * @returns -1 ou 1
     */
    #renvoiUnOuMoinsUn() {
        return 2 * Math.floor(Math.random() * 2) - 1;
    }


    /**
     * Création du path d'une pièce de puzzle à partir de la formeDeLaPiece
     * 
     * Chaque côté d'une pièce de puzzle est construite à partir de 6 courbes de Bézier
     * les coordonnées de chaque courbe de bézier sont calculés à partir de la forme de la pièce et d'un tableau contenant l'ensemble des points de passage de la courbe
     * 
     * @param {Number} tileRatio 
     * @param {Array} formeDeLaPiece 
     * @param {*} sommetHautGauche 
     * @returns 
     */
    #createOneTileMask(tileRatio, formeDeLaPiece, sommetHautGauche) {

        // Récupération des coordonnées qui seront utilisés pour traces les courbes de Beziers de l'ensemble des parties de la pièce de puzzle
        let courbesPartieSuperieur = this.#getCoordonneesCourbesPartieSuperieureDepuisSommetHautGauche(tileRatio, formeDeLaPiece.topTab);
        let courbesPartieDroite = this.#getCoordonneesCourbesPartieDroiteDepuisSommetHautDroite(tileRatio, formeDeLaPiece.rightTab);
        let courbesPartieInferieur = this.#getCoordonneesCourbesPartieInferieureDepuisSommetHautDroite(tileRatio, formeDeLaPiece.bottomTab);
        let courbesPartieGauche = this.#getCoordonneesCourbesPartieGaucheDepuisSommetBasGauche(tileRatio, formeDeLaPiece.leftTab);

        let tileWidth = 100 * tileRatio;

        let sommetHautDroite = {
            x: sommetHautGauche.x + tileWidth,
            y: sommetHautGauche.y
        };

        let sommetBasDroite = {
            x: sommetHautGauche.x + tileWidth,
            y: sommetHautGauche.y + tileWidth
        };

        let sommetBasGauche = {
            x: sommetHautGauche.x,
            y: sommetHautGauche.y + tileWidth
        };

        // Construction du path à partir des courbes de bézier calculés plus haut
        let line = new fabric.Path(
            // Path de la partie haute de la pièce en partant du sommetHautGauche
            `M ${courbesPartieSuperieur[0].cx1 + sommetHautGauche.x} ${courbesPartieSuperieur[0].cy1 + sommetHautGauche.y}` +
            ` C ${courbesPartieSuperieur[0].cx1 + sommetHautGauche.x} ${courbesPartieSuperieur[0].cy1 + sommetHautGauche.y} ${courbesPartieSuperieur[0].cx2 + sommetHautGauche.x} ${courbesPartieSuperieur[0].cy2 + sommetHautGauche.y} ${courbesPartieSuperieur[0].ex + sommetHautGauche.x} ${courbesPartieSuperieur[0].ey + sommetHautGauche.y}` +
            ` C ${courbesPartieSuperieur[1].cx1 + sommetHautGauche.x} ${courbesPartieSuperieur[1].cy1 + sommetHautGauche.y} ${courbesPartieSuperieur[1].cx2 + sommetHautGauche.x} ${courbesPartieSuperieur[1].cy2 + sommetHautGauche.y} ${courbesPartieSuperieur[1].ex + sommetHautGauche.x} ${courbesPartieSuperieur[1].ey + sommetHautGauche.y}` +
            ` C ${courbesPartieSuperieur[2].cx1 + sommetHautGauche.x} ${courbesPartieSuperieur[2].cy1 + sommetHautGauche.y} ${courbesPartieSuperieur[2].cx2 + sommetHautGauche.x} ${courbesPartieSuperieur[2].cy2 + sommetHautGauche.y} ${courbesPartieSuperieur[2].ex + sommetHautGauche.x} ${courbesPartieSuperieur[2].ey + sommetHautGauche.y}` +
            ` C ${courbesPartieSuperieur[3].cx1 + sommetHautGauche.x} ${courbesPartieSuperieur[3].cy1 + sommetHautGauche.y} ${courbesPartieSuperieur[3].cx2 + sommetHautGauche.x} ${courbesPartieSuperieur[3].cy2 + sommetHautGauche.y} ${courbesPartieSuperieur[3].ex + sommetHautGauche.x} ${courbesPartieSuperieur[3].ey + sommetHautGauche.y}` +
            ` C ${courbesPartieSuperieur[4].cx1 + sommetHautGauche.x} ${courbesPartieSuperieur[4].cy1 + sommetHautGauche.y} ${courbesPartieSuperieur[4].cx2 + sommetHautGauche.x} ${courbesPartieSuperieur[4].cy2 + sommetHautGauche.y} ${courbesPartieSuperieur[4].ex + sommetHautGauche.x} ${courbesPartieSuperieur[4].ey + sommetHautGauche.y}` +
            ` C ${courbesPartieSuperieur[5].cx1 + sommetHautGauche.x} ${courbesPartieSuperieur[5].cy1 + sommetHautGauche.y} ${courbesPartieSuperieur[5].cx2 + sommetHautGauche.x} ${courbesPartieSuperieur[5].cy2 + sommetHautGauche.y} ${courbesPartieSuperieur[5].ex + sommetHautGauche.x} ${courbesPartieSuperieur[5].ey + sommetHautGauche.y}`

            // Path de la partie droite de la pièce en partant du sommetHautDroite
            +
            ` C ${courbesPartieDroite[0].cx1 + sommetHautDroite.x} ${courbesPartieDroite[0].cy1 + sommetHautDroite.y} ${courbesPartieDroite[0].cx2 + sommetHautDroite.x} ${courbesPartieDroite[0].cy2 + sommetHautDroite.y} ${courbesPartieDroite[0].ex + sommetHautDroite.x} ${courbesPartieDroite[0].ey + sommetHautDroite.y}` +
            ` C ${courbesPartieDroite[1].cx1 + sommetHautDroite.x} ${courbesPartieDroite[1].cy1 + sommetHautDroite.y} ${courbesPartieDroite[1].cx2 + sommetHautDroite.x} ${courbesPartieDroite[1].cy2 + sommetHautDroite.y} ${courbesPartieDroite[1].ex + sommetHautDroite.x} ${courbesPartieDroite[1].ey + sommetHautDroite.y}` +
            ` C ${courbesPartieDroite[2].cx1 + sommetHautDroite.x} ${courbesPartieDroite[2].cy1 + sommetHautDroite.y} ${courbesPartieDroite[2].cx2 + sommetHautDroite.x} ${courbesPartieDroite[2].cy2 + sommetHautDroite.y} ${courbesPartieDroite[2].ex + sommetHautDroite.x} ${courbesPartieDroite[2].ey + sommetHautDroite.y}` +
            ` C ${courbesPartieDroite[3].cx1 + sommetHautDroite.x} ${courbesPartieDroite[3].cy1 + sommetHautDroite.y} ${courbesPartieDroite[3].cx2 + sommetHautDroite.x} ${courbesPartieDroite[3].cy2 + sommetHautDroite.y} ${courbesPartieDroite[3].ex + sommetHautDroite.x} ${courbesPartieDroite[3].ey + sommetHautDroite.y}` +
            ` C ${courbesPartieDroite[4].cx1 + sommetHautDroite.x} ${courbesPartieDroite[4].cy1 + sommetHautDroite.y} ${courbesPartieDroite[4].cx2 + sommetHautDroite.x} ${courbesPartieDroite[4].cy2 + sommetHautDroite.y} ${courbesPartieDroite[4].ex + sommetHautDroite.x} ${courbesPartieDroite[4].ey + sommetHautDroite.y}` +
            ` C ${courbesPartieDroite[5].cx1 + sommetHautDroite.x} ${courbesPartieDroite[5].cy1 + sommetHautDroite.y} ${courbesPartieDroite[5].cx2 + sommetHautDroite.x} ${courbesPartieDroite[5].cy2 + sommetHautDroite.y} ${courbesPartieDroite[5].ex + sommetHautDroite.x} ${courbesPartieDroite[5].ey + sommetHautDroite.y}`

            // Path de la partie basse de la pièce en partant du sommetBasDroite
            +
            ` C ${courbesPartieInferieur[0].cx1 + sommetBasDroite.x} ${courbesPartieInferieur[0].cy1 + sommetBasDroite.y} ${courbesPartieInferieur[0].cx2 + sommetBasDroite.x} ${courbesPartieInferieur[0].cy2 + sommetBasDroite.y} ${courbesPartieInferieur[0].ex + sommetBasDroite.x} ${courbesPartieInferieur[0].ey + sommetBasDroite.y}` +
            ` C ${courbesPartieInferieur[1].cx1 + sommetBasDroite.x} ${courbesPartieInferieur[1].cy1 + sommetBasDroite.y} ${courbesPartieInferieur[1].cx2 + sommetBasDroite.x} ${courbesPartieInferieur[1].cy2 + sommetBasDroite.y} ${courbesPartieInferieur[1].ex + sommetBasDroite.x} ${courbesPartieInferieur[1].ey + sommetBasDroite.y}` +
            ` C ${courbesPartieInferieur[2].cx1 + sommetBasDroite.x} ${courbesPartieInferieur[2].cy1 + sommetBasDroite.y} ${courbesPartieInferieur[2].cx2 + sommetBasDroite.x} ${courbesPartieInferieur[2].cy2 + sommetBasDroite.y} ${courbesPartieInferieur[2].ex + sommetBasDroite.x} ${courbesPartieInferieur[2].ey + sommetBasDroite.y}` +
            ` C ${courbesPartieInferieur[3].cx1 + sommetBasDroite.x} ${courbesPartieInferieur[3].cy1 + sommetBasDroite.y} ${courbesPartieInferieur[3].cx2 + sommetBasDroite.x} ${courbesPartieInferieur[3].cy2 + sommetBasDroite.y} ${courbesPartieInferieur[3].ex + sommetBasDroite.x} ${courbesPartieInferieur[3].ey + sommetBasDroite.y}` +
            ` C ${courbesPartieInferieur[4].cx1 + sommetBasDroite.x} ${courbesPartieInferieur[4].cy1 + sommetBasDroite.y} ${courbesPartieInferieur[4].cx2 + sommetBasDroite.x} ${courbesPartieInferieur[4].cy2 + sommetBasDroite.y} ${courbesPartieInferieur[4].ex + sommetBasDroite.x} ${courbesPartieInferieur[4].ey + sommetBasDroite.y}` +
            ` C ${courbesPartieInferieur[5].cx1 + sommetBasDroite.x} ${courbesPartieInferieur[5].cy1 + sommetBasDroite.y} ${courbesPartieInferieur[5].cx2 + sommetBasDroite.x} ${courbesPartieInferieur[5].cy2 + sommetBasDroite.y} ${courbesPartieInferieur[5].ex + sommetBasDroite.x} ${courbesPartieInferieur[5].ey + sommetBasDroite.y}`

            // Path de la partie gauche de la pièce en partant du sommetBasGauche
            +
            ` C ${courbesPartieGauche[0].cx1 + sommetBasGauche.x} ${courbesPartieGauche[0].cy1 + sommetBasGauche.y} ${courbesPartieGauche[0].cx2 + sommetBasGauche.x} ${courbesPartieGauche[0].cy2 + sommetBasGauche.y} ${courbesPartieGauche[0].ex + sommetBasGauche.x} ${courbesPartieGauche[0].ey + sommetBasGauche.y}` +
            ` C ${courbesPartieGauche[1].cx1 + sommetBasGauche.x} ${courbesPartieGauche[1].cy1 + sommetBasGauche.y} ${courbesPartieGauche[1].cx2 + sommetBasGauche.x} ${courbesPartieGauche[1].cy2 + sommetBasGauche.y} ${courbesPartieGauche[1].ex + sommetBasGauche.x} ${courbesPartieGauche[1].ey + sommetBasGauche.y}` +
            ` C ${courbesPartieGauche[2].cx1 + sommetBasGauche.x} ${courbesPartieGauche[2].cy1 + sommetBasGauche.y} ${courbesPartieGauche[2].cx2 + sommetBasGauche.x} ${courbesPartieGauche[2].cy2 + sommetBasGauche.y} ${courbesPartieGauche[2].ex + sommetBasGauche.x} ${courbesPartieGauche[2].ey + sommetBasGauche.y}` +
            ` C ${courbesPartieGauche[3].cx1 + sommetBasGauche.x} ${courbesPartieGauche[3].cy1 + sommetBasGauche.y} ${courbesPartieGauche[3].cx2 + sommetBasGauche.x} ${courbesPartieGauche[3].cy2 + sommetBasGauche.y} ${courbesPartieGauche[3].ex + sommetBasGauche.x} ${courbesPartieGauche[3].ey + sommetBasGauche.y}` +
            ` C ${courbesPartieGauche[4].cx1 + sommetBasGauche.x} ${courbesPartieGauche[4].cy1 + sommetBasGauche.y} ${courbesPartieGauche[4].cx2 + sommetBasGauche.x} ${courbesPartieGauche[4].cy2 + sommetBasGauche.y} ${courbesPartieGauche[4].ex + sommetBasGauche.x} ${courbesPartieGauche[4].ey + sommetBasGauche.y}` +
            ` C ${courbesPartieGauche[5].cx1 + sommetBasGauche.x} ${courbesPartieGauche[5].cy1 + sommetBasGauche.y} ${courbesPartieGauche[5].cx2 + sommetBasGauche.x} ${courbesPartieGauche[5].cy2 + sommetBasGauche.y} ${courbesPartieGauche[5].ex + sommetBasGauche.x} ${courbesPartieGauche[5].ey + sommetBasGauche.y}`

            , {
                fill: 'black',
                stroke: '',
                objectCaching: false,
                originX: 'left',
                originY: 'top',
            });

        return line;
    }


    /**
     * Renvoi le tableau des coordonnées des 6 courbes de béziers de la partie supérieure d'une pièce de puzzle
     * 
     * Avec les valeurs par défaut, renvoi les points des 6 courbes de bézier pour un bord mâle d'une longeur de 100px
     * 
     * @param {Number} tileRatio : permet de faire varier la longeur du bord
     * @param {Number} topTab : permet de le transformer en bord femelle ou en bord plat
     * @returns {Array} tableau contenant les coordonnées des 6 courbes de bézier du bord supérieur d'une pièce de puzzle
     */
    #getCoordonneesCourbesPartieSuperieureDepuisSommetHautGauche(tileRatio = 1, topTab = 1) {
        return ([{
                cx1: 0 * tileRatio,
                cy1: 0 * tileRatio * topTab,
                cx2: 35 * tileRatio,
                cy2: 15 * tileRatio * topTab,
                ex: 37 * tileRatio,
                ey: 5 * tileRatio * topTab
            }, // left shoulder
            {
                cx1: 37 * tileRatio,
                cy1: 5 * tileRatio * topTab,
                cx2: 40 * tileRatio,
                cy2: 0 * tileRatio * topTab,
                ex: 38 * tileRatio,
                ey: -5 * tileRatio * topTab
            }, // left neck
            {
                cx1: 38 * tileRatio,
                cy1: -5 * tileRatio * topTab,
                cx2: 20 * tileRatio,
                cy2: -20 * tileRatio * topTab,
                ex: 50 * tileRatio,
                ey: -20 * tileRatio * topTab
            }, // left head
            {
                cx1: 50 * tileRatio,
                cy1: -20 * tileRatio * topTab,
                cx2: 80 * tileRatio,
                cy2: -20 * tileRatio * topTab,
                ex: 62 * tileRatio,
                ey: -5 * tileRatio * topTab
            }, // right head
            {
                cx1: 62 * tileRatio,
                cy1: -5 * tileRatio * topTab,
                cx2: 60 * tileRatio,
                cy2: 0 * tileRatio * topTab,
                ex: 63 * tileRatio,
                ey: 5 * tileRatio * topTab
            }, // right neck
            {
                cx1: 63 * tileRatio,
                cy1: 5 * tileRatio * topTab,
                cx2: 65 * tileRatio,
                cy2: 15 * tileRatio * topTab,
                ex: 100 * tileRatio,
                ey: 0 * tileRatio * topTab
            }, // right shoulder
        ]);
    }

    /**
     * Renvoi le tableau des coordonnées des 6 courbes de béziers de la partie droite d'une pièce de puzzle
     * 
     * Avec les valeurs par défaut, renvoi les points des 6 courbes de bézier pour un bord mâle d'une longeur de 100px
     * 
     * @param {Number} tileRatio : permet de faire varier la longeur du bord
     * @param {Number} rightTab : permet de le transformer en bord femelle ou en bord plat
     * @returns {Array} tableau contenant les coordonnées des 6 courbes de bézier du bord de droite d'une pièce de puzzle
     */
    #getCoordonneesCourbesPartieDroiteDepuisSommetHautDroite(tileRatio, rightTab = 1) {
        return this.#mirror(this.#getCoordonneesCourbesPartieSuperieureDepuisSommetHautGauche(tileRatio, rightTab), 1, -1, true)
    }

    /**
     * Renvoi le tableau des coordonnées des 6 courbes de béziers de la partie gauche d'une pièce de puzzle
     * 
     * Avec les valeurs par défaut, renvoi les points des 6 courbes de bézier pour un bord mâle d'une longeur de 100px
     * 
     * @param {Number} tileRatio : permet de faire varier la longeur du bord
     * @param {Number} leftTab : permet de le transformer en bord femelle ou en bord plat
     * @returns {Array} tableau contenant les coordonnées des 6 courbes de bézier du bord de gauche d'une pièce de puzzle
     */
    #getCoordonneesCourbesPartieGaucheDepuisSommetBasGauche(tileRatio, leftTab = 1) {
        return this.#mirror(this.#getCoordonneesCourbesPartieSuperieureDepuisSommetHautGauche(tileRatio, leftTab), -1, 1, true)
    }


    /**
     * Renvoi le tableau des coordonnées des 6 courbes de béziers de la partie inférieure d'une pièce de puzzle
     * 
     * Avec les valeurs par défaut, renvoi les points des 6 courbes de bézier pour un bord mâle d'une longeur de 100px
     * 
     * @param {Number} tileRatio : permet de faire varier la longeur du bord
     * @param {Number} leftTab : permet de le transformer en bord femelle ou en bord plat
     * @returns {Array} tableau contenant les coordonnées des 6 courbes de bézier du bord inférieure d'une pièce de puzzle
     */
    #getCoordonneesCourbesPartieInferieureDepuisSommetHautDroite(tileRatio, bottomTab = 1) {
        return this.#mirror(this.#getCoordonneesCourbesPartieSuperieureDepuisSommetHautGauche(tileRatio, bottomTab), -1, -1)
    }

    /**
     * 
     * @param {Array} coordonneesCourbesBezier - tableau de coordonnées 
     * @param {Number} signX - vaut 1 ou -1 permet de faire une symétrie axiale par rapport à l'axe des x
     * @param {Number} signY - vaut 1 ou -1 permet de faire une symétrie axiale par rapport à l'axe des y
     * @param {Boolean} invertXY - Permet de faire une symétrie axiale par rapport à la fonction f(x) = x
     * @returns {Array}
     */
    #mirror(coordonneesCourbesBezier, signX, signY, invertXY = false) {
        let a = [];
        if (invertXY) {
            for (let i = 0; i < coordonneesCourbesBezier.length; i++) {
                let bb = coordonneesCourbesBezier[i];
                a.push({
                    cx1: bb.cy1 * signY,
                    cy1: bb.cx1 * signX,
                    cx2: bb.cy2 * signY,
                    cy2: bb.cx2 * signX,
                    ex: bb.ey * signY,
                    ey: bb.ex * signX,
                });
            }
        } else {
            for (let i = 0; i < coordonneesCourbesBezier.length; i++) {
                let bb = coordonneesCourbesBezier[i];
                a.push({
                    cx1: bb.cx1 * signX,
                    cy1: bb.cy1 * signY,
                    cx2: bb.cx2 * signX,
                    cy2: bb.cy2 * signY,
                    ex: bb.ex * signX,
                    ey: bb.ey * signY
                });
            }
        }
        return a;
    }

    /**
     * MAJ des champs permettant de savoir si il est groupé avec son voisin haut, droit, bas, gauche
     * @param {Puzzle} puzzle 
     */
    #majPourChaquePieceZoneACompleter() {

        this.tiles.forEach(piece => {
            let groupe = piece.getGroupe();
            if (!groupe) {
                return;
            }
            if (piece.besoinTraiterVoisinHaut()) {
                piece.__aCompleterHaut = !groupe.contains(this.#recupererVoisinHaut(piece));
            }
            if (piece.besoinTraiterVoisinBas()) {
                piece.__aCompleterBas = !groupe.contains(this.#recupererVoisinBas(piece));
            }
            if (piece.besoinTraiterVoisinGauche()) {
                piece.__aCompleterGauche = !groupe.contains(this.#recupererVoisinGauche(piece));
            }
            if (piece.besoinTraiterVoisinDroite()) {
                piece.__aCompleterDroite = !groupe.contains(this.#recupererVoisinDroite(piece));
            }
        })
    }

    /**
     * Permet de savoir si l'objet passé en paramètre est un objet fabric.Group
     * @param {*} target 
     * @returns 
     */
    #isGroupe(target) {
        // la présence de la méthode getObjects nous permet de dire que l'objet target est un groupe
        if (target?.getObjects?.()) {
            return true;
        }
        return false;
    }

    #siProcheVoisinGaucheGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(piece) {
        // si déjà coller ou voisin inexistant alors arréter le traitement
        if (!piece.besoinTraiterVoisinGauche()) {
            return false;
        }

        let voisinGauche = this.#recupererVoisinGauche(piece);

        let modif = this.#siProcheVoisinGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(piece, voisinGauche);

        if (modif) {
            this.#majPourChaquePieceZoneACompleter();
        }
        return modif;
    }


    #siProcheVoisinDroiteGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(piece) {
        // si déjà coller ou voisin inexistant alors arréter le traitement
        if (!piece.besoinTraiterVoisinDroite()) {
            return false;
        }

        let voisinDroite = this.#recupererVoisinDroite(piece);

        let modif = this.#siProcheVoisinGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(piece, voisinDroite);

        if (modif) {
            this.#majPourChaquePieceZoneACompleter();
        }


        return modif;
    }

    #siProcheVoisinHautGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(piece) {

        // si déjà coller ou voisin inexistant alors arréter le traitement
        if (!piece.besoinTraiterVoisinHaut()) {
            return false;
        }

        let voisinHaut = this.#recupererVoisinHaut(piece);

        let modif = this.#siProcheVoisinGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(piece, voisinHaut);

        if (modif) {
            this.#majPourChaquePieceZoneACompleter();
        }


        return modif;
    }

    #siProcheVoisinBasGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(piece) {

        // si déjà coller ou voisin inexistant alors arréter le traitement
        if (!piece.besoinTraiterVoisinBas()) {
            return false;
        }

        let voisinBas = this.#recupererVoisinBas(piece);

        let modif = this.#siProcheVoisinGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(piece, voisinBas);

        if (modif) {
            this.#majPourChaquePieceZoneACompleter();
        }


        return modif;
    }

    #siProcheVoisinGrouperLaPieceOuSonGroupeDansLeGroupeDuVoisin(piece, voisin) {

        // récupération des groupes pouvant contenir chaque pièce
        let groupeDeLaPiece = piece.__groupe;
        let groupeVoisin = voisin.__groupe;

        // -------------------------------------------------------------------------------------
        // -- Récupération des positions dans le canvas de la pièce actuelle et de son voisin --
        // -------------------------------------------------------------------------------------
        let voisinTop,
            voisinLeft,
            pieceTop,
            pieceLeft;

        // Récupération de la position de la pièce dans le canevas :
        // si la pièce n'est pas dans un groupe -> récupérer top et left
        // si la pièce est au sein d'un groupe alors les poisition récupérés sont relatives à son groupe
        //  |-> il faut alors effectuer un calcul pour obtenir sa position dans le canvas
        if (groupeDeLaPiece) {

            let matrix = groupeDeLaPiece.calcTransformMatrix();
            let positionPieceCanvas = fabric.util.transformPoint({
                y: piece.top,
                x: piece.left
            }, matrix);

            pieceTop = positionPieceCanvas.y;
            pieceLeft = positionPieceCanvas.x;
        } else {
            pieceTop = piece.top;
            pieceLeft = piece.left;
        }


        if (groupeVoisin) {
            let matrix = groupeVoisin.calcTransformMatrix();
            let positionVoisinCanvas = fabric.util.transformPoint({
                y: voisin.top,
                x: voisin.left
            }, matrix);
            voisinTop = positionVoisinCanvas.y;
            voisinLeft = positionVoisinCanvas.x;

        } else {
            voisinTop = voisin.top;
            voisinLeft = voisin.left;
        }

        // -----------------------------------------------
        // -- Calcul des distances parfaites et réelles --
        // -----------------------------------------------

        let distanceParfaiteY = piece.__posY - voisin.__posY;
        let distanceParfaiteX = piece.__posX - voisin.__posX;

        let distanceReelleY = pieceTop - voisinTop;
        let distanceReelleX = pieceLeft - voisinLeft;

        let differenceY = distanceParfaiteY - distanceReelleY;
        let differenceX = distanceParfaiteX - distanceReelleX;

        // -------------------------------------------------------------------
        // -- Rapprochement et groupement des pièces si suffisament proches --
        // -------------------------------------------------------------------

        if (Math.abs(differenceX) > config.margeErreur || Math.abs(differenceY) > config.margeErreur) {
            return false;
        }

        let nouveauGroupe = new Array();
        nouveauGroupe.push(voisin);

        if (groupeVoisin) {

            nouveauGroupe = [...groupeVoisin.getObjects()];

            // retirer le groupe du canvas
            canvas.remove(groupeVoisin);

            // suppression du groupe (permet de changer la position des pièces contenues dans le groupe
            // leur position n'est plus calculé relativement à la position du groupe mais par rapport
            // au canvas)
            groupeVoisin.destroy();
        } else {
            canvas.remove(voisin);
        }

        if (groupeDeLaPiece) {

            // Attention les distances parfaites ont été calculées par rapport à deux pieces et 
            // non une piece et un groupe (ou deux groupes), or le groupe peut être légérement décalé
            // en fonction des pièces sur le puzzle 
            // pour calculer ce décalage on compare le rectangle contenant notre piece récupéré via 
            // la méthode getBoundingRect, les coordonnées récupérés sont relatif au groupe
            // contenant la piece, on fait donc une transformation et là on compare nos deux coordonnées 
            let matrix = groupeDeLaPiece.calcTransformMatrix();
            let coordRectangle = piece.getBoundingRect();
            let coordRectangleCanvas = fabric.util.transformPoint({
                y: coordRectangle.top,
                x: coordRectangle.left
            }, matrix);

            groupeDeLaPiece.left = distanceParfaiteX + voisinLeft + (groupeDeLaPiece.left - coordRectangleCanvas.x);
            groupeDeLaPiece.top = distanceParfaiteY + voisinTop + (groupeDeLaPiece.top - coordRectangleCanvas.y);

            nouveauGroupe = [...nouveauGroupe, ...groupeDeLaPiece.getObjects()];

            // retirer le groupe du canvas
            canvas.remove(groupeDeLaPiece);

            // suppression du groupe (permet de changer la position des pièces contenues dans le groupe
            // leur position n'est plus calculé relativement à la position du groupe mais par rapport
            // au canvas)
            groupeDeLaPiece.destroy();

        } else {

            piece.top = distanceParfaiteY + voisinTop;
            piece.left = distanceParfaiteX + voisinLeft;

            nouveauGroupe.push(piece);
            canvas.remove(piece);
        }


        let groupe = new fabric.Group(nouveauGroupe, {
            hasControls: false,
            hasBorders: false,
            perPixelTargetFind: true,
        });
        canvas.add(groupe);

        // MAJ du champ groupe
        nouveauGroupe.forEach(membre => membre.__groupe = groupe);


        return true;
    }

}


// Lancement du jeu
(function () {

    fabric.Image.fromURL(config.urlPuzzle, function (img) {
        puzzle = new Puzzle(img);
        positionnementAleatoireDesPieces(puzzle, this.__canvas);
        ajoutGestionDesEvenements(puzzle);
    });

})();


function ajoutGestionDesEvenements(puzzle) {

    let panning = false;

    // Gestion des événements sur le canvas
    canvas.on({
        // Gestion du zoom
        'mouse:wheel': function (opt) {
            let delta = opt.e.deltaY;
            let zoom = canvas.getZoom();
            zoom *= 0.999 ** delta;
            if (zoom > 20) zoom = 20;
            if (zoom < 0.01) zoom = 0.01;
            canvas.zoomToPoint({
                x: opt.e.offsetX,
                y: opt.e.offsetY
            }, zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        },
        'mouse:down': function (e) {
            if (e.target) {
                panning = false;
                e.target.opacity = 0.5;
            } else {
                panning = true;
            }
        },
        'mouse:up': function (e) {
            if (e.target) {
                e.target.opacity = 1;
                // grouper Pieces du puzzle si assez proche
                let modifPuzzle = puzzle.siProcheVoisinRapprocherEtGrouperLesPieces(e.target);

                // TODO : vérifier si le puzzle est terminée
            }
            panning = false;
        },
        'mouse:move': function (e) {
            if (panning) {
                let delta = new fabric.Point(e.e.movementX, e.e.movementY);
                canvas.relativePan(delta);
            }
        },
    });

    canvas.setBackgroundColor('rgba(179, 179, 179, 0.1)', canvas.renderAll.bind(canvas));
}


/**
 * Positionnement aléatoire des pièces du puzzle fourni en entrée dans le canvas
 * @param {Puzzle} puzzle 
 * @param {fabric.Canvas} canvasCible 
 */
function positionnementAleatoireDesPieces(puzzle, canvasCible) {
    puzzle.tiles.forEach(tile => {
        tile.set({
            top: randomNumber(2 * puzzle.tileWidth, tailleCanvas.height - 2 * puzzle.tileWidth),
            left: randomNumber(2 * puzzle.tileWidth, tailleCanvas.width - 2 * puzzle.tileWidth),
        });
        canvasCible.add(tile);
    })
}

/**
 * Renvoi un nombre aléatoire x tel que  max >= x >= min
 * @param {Number} min 
 * @param {Number}  max
 * @returns {Number}
 */
function randomNumber(min, max) {
    return min + Math.floor(Math.random() * (max - min));
}