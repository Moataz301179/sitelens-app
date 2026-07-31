-- Copy the SiteLens.app icon onto the desktop .command launcher
tell application "Finder"
	set targetFile to POSIX file "/Users/Moataz/Desktop/SiteLens.command" as alias
	set sourceApp to POSIX file "/Users/Moataz/Applications/SiteLens.app" as alias
	set icon of targetFile to icon of sourceApp
end tell
