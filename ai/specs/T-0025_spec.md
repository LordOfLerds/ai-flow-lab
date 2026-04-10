T-0025 Spec

Task metadata
	•	task_id: T-0025
	•	title: Bei game noch immer kein Start-Button sichtbar
	•	lane_type: bug-lane
	•	executor: codex

Problem statement

Beim Aufruf über game bzw. game.html ist laut Fehlerbeschreibung zwar der Spieltitel sichtbar, aber die Start-/Menüknöpfe fehlen. Das bedeutet: Der Nutzer landet offenbar nicht in einem vollständig benutzbaren Startzustand.

Aus dem aktuellen Codekontext ergeben sich zwei relevante Oberflächen:
	•	index.html enthält die eigentliche App-Oberfläche mit Overlay und #menu-content
	•	game.html ist als Redirect-Seite implementiert und soll zu index.html weiterleiten

Damit gibt es einen offensichtlichen Widerspruch zwischen dem beabsichtigten Modell und dem beobachteten Verhalten:
	•	Entweder greift der Redirect-/Entry-Point-Pfad nicht sauber,
	•	oder die Zielseite rendert beim Aufruf über game einen unvollständigen Overlay-/Menüzustand,
	•	oder ein Timing-/Initialisierungsproblem verhindert das Befüllen von #menu-content.

Da die Truth-Docs in dieser Eingabe nicht enthalten sind, muss der Executor zuerst prüfen, was docs/DOMAIN_MODEL.md, docs/INVARIANTS.md, docs/ARCHITECTURE.md und ggf. ADRs über unterstützte Entry-Points und den erwarteten Start-UI-Zustand sagen. Falls der Code den Docs voraus ist oder ihnen widerspricht, muss diese Unsicherheit explizit benannt und ein echter Konflikt im Drift-Register dokumentiert werden.

Source of truth

Primäre Source-of-Truth-Reihenfolge laut AGENTS.md:
	1.	docs/DOMAIN_MODEL.md
	2.	docs/INVARIANTS.md
	3.	docs/ARCHITECTURE.md
	4.	docs/ADR/

Zusätzliche relevante Evidenz aus dem bereitgestellten Code:
	•	index.html
	•	enthält das eigentliche Canvas, HUD, Overlay und #menu-content
	•	damit ist dies klar die Runtime-Oberfläche, in der Start-Buttons überhaupt erscheinen können
	•	game.html
	•	enthält keinen eigenen Start-Button
	•	nutzt Meta-Refresh und window.location.replace('./index.html')
	•	soll also nur weiterleiten, nicht selbst die Spiel-UI hosten

Bereits aus früheren Aufgabenbezügen ist naheliegend, dass game.html bzw. game als unterstützte Einstiegspfade behandelt werden sollten. Da die zugehörigen Truth-Docs hier aber nicht eingeblendet sind, bleibt offen, ob exakt game.html, auch /game, oder nur index.html offiziell garantiert sind. Diese Unsicherheit muss vor einer Fix-Entscheidung durch Doc-Review aufgelöst werden.

Desired behavior

Das Bugfix-Ziel ist eng und nutzerzentriert:
	•	Wenn der unterstützte Einstiegspfad game.html oder der in den Truth-Docs definierte game-Pfad aufgerufen wird, muss der Nutzer zuverlässig zu einer vollständig nutzbaren Startoberfläche gelangen.
	•	„Vollständig nutzbar“ bedeutet mindestens:
	•	der Spieltitel ist sichtbar,
	•	die Menü-/Start-Buttons sind sichtbar,
	•	die Startoberfläche ist interaktiv und nicht nur statischer Overlay-Text,
	•	der Nutzer kann von dort das Spiel starten bzw. den vorgesehenen Menüfluss nutzen.

Technisch darf die Lösung auf zwei Arten korrekt sein, solange sie mit den Docs übereinstimmt:
	1.	Sauberer Redirect-Fix
	•	Aufruf über game.html/game landet korrekt in index.html
	•	dort erscheint dieselbe Start-UI wie beim direkten Aufruf von index.html
	2.	Initialisierungs-/Rendering-Fix
	•	Falls die Weiterleitung bereits korrekt funktioniert, muss die Overlay-/Menüinitialisierung so repariert werden, dass #menu-content beim Eintritt über den betroffenen Pfad nicht leer bleibt

Wichtig: Der Fix darf nicht auf bloßes „Titel sichtbar“ reduzieren. Die funktionsfähige Start-UI ist der relevante Sollzustand.

Constraints
	•	Zuerst Docs lesen, dann ändern.
	•	Bugfix klein und gezielt halten; keine breite UI- oder Routing-Neuarchitektur.
	•	Keine neuen Business-Regeln erfinden.
	•	Falls Docs und getesteter Code widersprechen, nicht stillschweigend entscheiden, sondern ai/current-state/drift-register.md aktualisieren.
	•	Falls game.html laut Docs nur Redirect-Kompatibilität ist, darf dort keine zweite eigenständige Start-UI aufgebaut werden.
	•	Keine unnötige Duplizierung von Menülogik zwischen index.html und game.html.
	•	Keine breiten Änderungen an Login-, HUD-, XP-, Skill- oder Gameplay-Systemen, außer sie sind direkt ursächlich für den fehlenden Start-Button.
	•	Fix muss mit bereits existierenden Start-UI-/Entry-Point-Tests kompatibel bleiben und darf deren Zielbild nicht stillschweigend verschieben.

Acceptance criteria
	•	Der Executor hat vor dem Fix die Truth-Docs geprüft:
	•	docs/DOMAIN_MODEL.md
	•	docs/INVARIANTS.md
	•	docs/ARCHITECTURE.md
	•	relevante docs/ADR/-Einträge
	•	Der reproduzierte Fehler ist verstanden und im Report konkret beschrieben:
	•	welcher Pfad betroffen ist (game.html, /game, oder beides)
	•	ob der Redirect fehlschlägt oder die Zielseite unvollständig rendert
	•	Beim Aufruf über den betroffenen unterstützten Einstiegspfad ist die Startoberfläche vollständig sichtbar:
	•	Titel sichtbar
	•	Start-/Menübuttons sichtbar
	•	Buttons benutzbar
	•	#menu-content bleibt im betroffenen Startzustand nicht leer, sofern dies die Ursache des Fehlers war.
	•	Falls game.html nur Redirect sein soll, bleibt es eine Kompatibilitätsoberfläche und wird nicht zu einer zweiten separaten Runtime-Seite ausgebaut.
	•	Direkter Aufruf von index.html bleibt funktional unverändert bzw. regressionsfrei.
	•	Falls ein echter Widerspruch zwischen Docs und Code gefunden wird, ist er im Drift-Register dokumentiert.
	•	Relevante Tests bzw. Smoke-Checks für Start-UI-Sichtbarkeit über die unterstützten Einstiegspfade laufen erfolgreich oder der Executor berichtet präzise, was noch blockiert.

Risks
	•	Der Bug kann entweder im Redirect, im Timing der Weiterleitung, in der Overlay-Initialisierung oder in der Befüllung von #menu-content liegen; eine vorschnelle Fix-Annahme könnte nur Symptome überdecken.
	•	game.html prüft im Script auch /game, aber ohne Truth-Docs oder Hosting-Konfiguration ist nicht sicher, ob /game tatsächlich offiziell unterstützt ist.
	•	Ein „schneller Fix“ direkt in game.html könnte versehentlich eine zweite UI-Oberfläche erzeugen und damit die dokumentierte Architektur verletzen.
	•	Falls Start-Buttons von Login-/Session- oder Menüaufbau abhängen, könnte die Ursache indirekt in Initialisierungsreihenfolge oder State-Handling liegen.
	•	Es existieren bereits verwandte Tasks zu Start-UI und Entry-Points; der Fix darf deren Zielmodell nicht unbemerkt verschieben.

Open questions
	•	Welcher Einstiegspfad ist laut Truth-Docs offiziell unterstützt: nur game.html, auch /game, oder nur die Weiterleitung nach index.html?
	•	Ist der beobachtete Fehler ein Redirect-Problem oder ein Problem der Menüinitialisierung auf index.html?
	•	Wird #menu-content beim problematischen Aufruf gar nicht befüllt, zu spät befüllt, oder durch spätere Logik wieder geleert?
	•	Hängen die sichtbaren Start-Buttons vom Auth-/Session-Zustand ab, obwohl sie für den initialen Spielstart sichtbar sein sollten?
	•	Welche der bestehenden Smoke-Tests (T-0019, T-0020) decken den aktuellen Fehler bereits ab, und reproduzieren sie ihn zuverlässig?