class ColorScheme {
    constructor(dataLayer) {
        this.dataLayer = dataLayer;
        this.colorMap = {};
    }

    async init() {
        this.colorMap = await this.dataLayer.getColorScheme();
    }

    async refreshColorScheme(refresh) {
        try {
            this.colorMap = await this.dataLayer.getColorScheme(refresh);
            console.log("Loaded Color Scheme");
        } catch (e) {
            console.log("Error Getting Color Palette", e)

        }
    }
}

// colorScheme.classColors = {
//     '-': '#ffa500',
//     0: '#1f78b4',
//     1: '#e31a1c',
//     2: '#33a02c',
//     3: '#6a3d9a',
//     4: '#b15928',
//     5: '#ffff99',
//     6: '#a6cee3',
//     7: '#b2df8a',
//     8: '#fb9a99',
//     9: '#cab2d6'
// }
//
// colorScheme.
// //colorScheme.classrColors = {'-' : [255,165,0], "0" : [141,211,199], "1" : [255,255,179], "2" : [190,186,218], "3": [251,128,114] }




