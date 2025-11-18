import React from "react";


function Dashboard (){
    return(
        <div
            className="dashboard right-side">
                
            {/* <h1>Dashboard</h1> */}
            <h1 style={{ marginTop: "0.1em", marginBottom: "0.3em" }}>
            Welcome to the <em>World of Crayfish</em><sup>®</sup>
            </h1>

            <h3 style={{ marginTop: "0.1em" , marginBottom: "0.3em"}}>Your hub for science, education and entertainment</h3>
            <h3 style={{ marginTop: "0.1em" }}>explore by making your selection below</h3>

            <img
                src={process.env.REACT_APP_PUBLIC_URL + "/wallpaper.jpg"}
                alt="Logo"
                className="wallpaper"
            />
        </div>
    );

}

export default Dashboard;