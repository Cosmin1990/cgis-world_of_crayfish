    class User{
        constructor(
            public id: number,
            public username: string,
            public password: string,
            public email: string,
            public affiliation: string,
            public role: string,
        ){}

    }

    export default User;
    
    // id = Column(INTEGER(11), primary_key=True)
    // username = Column(String(255), unique=True, nullable=False)
    // password = Column(String(255), nullable=False)
    // salt = Column(String(255), nullable=True)
    // email = Column(String(255), unique=True, nullable=False)
    // affiliation = Column(String(255))
    // role = Column(Enum('visitor', 'specialist', 'admin'), server_default=text("'visitor'"))
    // created_on = Column(DateTime, server_default=text("current_timestamp()"))
    
    