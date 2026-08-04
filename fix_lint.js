const fs = require('fs');

let content = fs.readFileSync('src/components/SatelliteGame.tsx', 'utf8');

// The react-hooks/set-state-in-effect rule is just a warning/error from ESLint but won't break the build.
// However, let's fix the exhaustive-deps warning to make it clean.
content = content.replace('// Helper: Get Satellite Position based on timePassed\n  const getSatellitePosition = (t: number) => {', '// Helper: Get Satellite Position based on timePassed\n  const getSatellitePosition = React.useCallback((t: number) => {');
content = content.replace('return { lat, lng };\n  };', 'return { lat, lng };\n  }, [orbitPeriod]);');

// Fix the useEffect dependency array
content = content.replace('}, [isAlive, isSetupComplete, selectedStation, timePassed, isMounted]);', '}, [isAlive, isSetupComplete, selectedStation, timePassed, isMounted, getSatellitePosition, orbitPeriod]);');


fs.writeFileSync('src/components/SatelliteGame.tsx', content, 'utf8');
