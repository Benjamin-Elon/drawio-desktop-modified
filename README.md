Trellis for Drawio extends Draw.io with a coordinated suite of plugins that turn diagrams into interactive, computational garden plans.

Most of the plugin depend on local database access and therefor require this slightly modified version of Drawio. The only changes are a file system bridge for Database access, and new built-in plugins.

The system functions as a garden-planning IDE:
1. Create yearly business plans.
2. Draw beds, garden zones, and modules.
3. Drag crops into place and generate schedules based on climate, GDD, frost windows, and plant traits.
4. Plan multi-crop successions and turnovers.
5. Manage tasks with Automated, linked Kanban boards.
6. Build multi-person workflows using role cards and team modules.
7. Automatically track and visualize when diagram elements were created or edited, using time-based coloring, filtering, and navigation to explore change history directly on the canvas.
8. In addition to all the base features included ini Draw.io

Who This Is For
1. Home gardeners
2. Market gardeners
3. School garden programs and teachers
4. Urban agriculture projects
5. Designers seeking visual + computational diagrams
6. Anyone who dislikes juggling spreadsheets and calendar apps

Why Draw.io?
-Draw.io offers:
1. A fast, responsive graphical canvas
2. XML-structured shapes (ideal for embedding data)
3. A plugin system with full graph access
4. Zero server dependencies
5. Offline desktop and online webapp support
6. Compatibility with existing Draw.io diagrams

To run this:
1. `npm install` (in the root directory of this repo)
2. [internal use only] export DRAWIO_ENV=dev if you want to develop/debug in dev mode.
3. `npm start` _in the root directory of this repo_ runs the app. For debugging, use `npm start --enable-logging`.

To Build This:
(in the root directory of this repo)
1. "npm run release-win"
2. "npm run release-win32"
3. "npm run release-win-arm64"
4. "npm run release-appx"
5. "npm run release-linux"
6. "npm run release-snap"

Getting started:
1. Run or build the project.
2. Go to plugin menu (under extras) and install the built in plugins.
3. Have fun! (detailed guide coming soon)
