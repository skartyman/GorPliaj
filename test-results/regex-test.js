var html = '<link rel="manifest" href="/manifest.webmanifest?v=8" />';
var regex = /<link rel="manifest" href="[^"]*">/;
console.log("Manifest regex match:", regex.test(html));
console.log("Manifest replace result:", html.replace(regex, 'REPLACED'));

var html2 = '<meta name="theme-color" content="#10344d" />';
var regex2 = /<meta name="theme-color" content="[^"]*">/;
console.log("Theme regex match:", regex2.test(html2));
console.log("Theme replace result:", html2.replace(regex2, 'REPLACED'));
