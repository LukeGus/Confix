function App() {
    return (
        <div className="bg-black w-full h-screen text-center flex flex-col items-center justify-center px-6">
            <h1 className="text-white text-3xl mb-16">Migrate to Termix:</h1>
            <p className="text-white text-base max-w-2xl">
                Confix is merging with Tunnelix and Termix (my other two projects) to form a single, easy-to-maintain tool that simplifies SSH connections in one place.
                <br /><br />
                To get started with Termix, visit the{" "}
                <a
                    href="https://github.com/LukeGus/Termix"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline"
                >
                    Termix GitHub repository
                </a>{" "}
                for installation instructions.
                <br /><br />
                If you prefer to continue using the old version of Confix, please update your Docker Compose file to use:<br />
                <code className="text-green-400">ghcr.io/lukegus/confix:release-0.2</code> instead of <code className="text-green-400">ghcr.io/lukegus/confix:latest</code>.
                <br /><br />
                Your data is safe.
            </p>
        </div>
    );
}

export default App;