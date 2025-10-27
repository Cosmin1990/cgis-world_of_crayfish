import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Record from "../model/Record";


function PhotoArea() {
    const photos = [
        "/crayfish_1.jpg",
        "/crayfish_2.jpg",
        "/crayfish_3.jpg"
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", maxHeight: "100%", overflowY: "auto" }}>
            {photos.map((src, index) => (
                <img key={index} src={src} alt={`Photo ${index + 1}`} style={{ width: "60%", height: "auto", objectFit: "cover" }} />
            ))}
        </div>
    );
}

export default PhotoArea;