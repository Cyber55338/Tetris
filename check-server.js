const http = require('http');

http.get('http://localhost:8080/nodes.js', (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        // Check if Hero node has dataSource
        const heroMatch = data.match(/'Hero':\s*\{[^}]*properties:\s*\[([^\]]*)\]/s);

        if (heroMatch) {
            const properties = heroMatch[1];
            console.log('=== Hero node properties ===');
            console.log(properties);
            console.log('\n=== Has dataSource? ===');
            console.log(properties.includes('dataSource') ? 'YES - CACHED VERSION!' : 'NO - CORRECT VERSION');
        } else {
            console.log('Could not find Hero node definition');
        }

        // Also check file headers
        console.log('\n=== Response Headers ===');
        console.log(res.headers);
    });
}).on('error', (e) => {
    console.error(`Error: ${e.message}`);
});
