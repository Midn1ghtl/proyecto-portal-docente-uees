(function () {
    const host = window.location.hostname;
    const octetos = host.split(".").map(Number);
    const esIPv4Privada = octetos.length === 4 &&
        octetos.every((octeto) => Number.isInteger(octeto) && octeto >= 0 && octeto <= 255) &&
        (octetos[0] === 10 ||
            (octetos[0] === 172 && octetos[1] >= 16 && octetos[1] <= 31) ||
            (octetos[0] === 192 && octetos[1] === 168) ||
            octetos[0] === 127);
    const esLocal = window.location.protocol === "file:" ||
        host === "localhost" ||
        host.endsWith(".localhost") ||
        host.endsWith(".local") ||
        (!host.includes(".") && host !== "") ||
        esIPv4Privada;
    const apiOrigin = esLocal
        ? `http://${host || "localhost"}:3000`
        : window.location.origin;

    window.PORTAL_API_URL = `${apiOrigin}/api/v1`;
})();
