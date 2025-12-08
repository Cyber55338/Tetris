const http = require('http');
const fs = require('fs');

http.get('http://localhost:8080/nodes.js', (res) => {
    const fileStream = fs.createWriteStream('nodes-served.js');
    res.pipe(fileStream);

    fileStream.on('finish', () => {
        fileStream.close();
        console.log('Downloaded nodes.js from server to nodes-served.js');

        // Now check for Hero node dataSource
        const content = fs.readFileSync('nodes-served.js', 'utf8');

        // Find Hero node section
        const heroIndex = content.indexOf("'Hero':");
        if (heroIndex !== -1) {
            const heroSection = content.substring(heroIndex, heroIndex + 500);
            console.log('\n=== Hero node section ===');
            console.log(heroSection);

            if (heroSection.includes('dataSource')) {
                console.log('\n❌ ERROR: Hero node HAS dataSource in served file!');
            } else {
                console.log('\n✓ OK: Hero node does NOT have dataSource in served file');
            }
        }
    });
}).on('error', (e) => {
    console.error(`Error: ${e.message}`);
});
