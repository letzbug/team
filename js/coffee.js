// One brief, locally selected interlude; no extra reasoning requests.
export const COFFEE={
 de:[['Mmmh … verdammt guter Kaffee. Ich glaube, ich bin verliebt.','Ich habe andere Bohnen besorgt. Hat sich offenbar gelohnt.','delight'],['Uff … boah, ist der Kaffee schlecht.','Ich weiß. Die Bohnen sind weit übers Datum. Deshalb trinke ich keinen.','disgust'],['Mmmh … dieser Duft. Mit dem Kaffee würde ich glatt durchbrennen.','Dann nehme ich die Maschine. Irgendwer muss ja vernünftig bleiben.','delight'],['Bäh … der schmeckt wie ein Softwarefehler.','Dann bitte nicht noch einmal auf Aufwärmen klicken.','disgust'],['Oh … samtweich. Den Moment möchte ich kurz heiraten.','Gut, ich besorge die Ringe. Du kümmerst dich um die Bohnen.','delight']],
 fr:[['Mmmh … ce café est délicieux. Je crois que je suis amoureux.','J’ai changé de grains. Ça valait le coup.','delight'],['Beurk … ce café est affreux.','Je sais. Les grains sont périmés. Voilà pourquoi je n’en bois pas.','disgust']],
 en:[['Mmm … damn good coffee. I think I’m in love.','I bought different beans. Apparently worth it.','delight'],['Ugh … this coffee is terrible.','I know. The beans expired ages ago. That’s why I’m not drinking any.','disgust']]
};
export function coffeeScene(language,random=Math.random){const items=COFFEE[language]||COFFEE.de;return items[Math.floor(random()*items.length)];}
