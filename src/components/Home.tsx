import {
  Tab,
  Form,
  Row,
  Col,
  Nav,
  Container,
  Button,
  Spinner,
} from "react-bootstrap";
import styles from "../assets/Home.module.scss";
import { useCallback, useMemo, useState } from "react";
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  SignUpCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import Cookies from "js-cookie";

const Home = () => {
  const [validate, setValidate] = useState<boolean>(false);
  const [spinnerOn, setSpinnerOn] = useState<boolean>(false);
  const [validateConfirmForm, setValidateConfirmForm] =
    useState<boolean>(false);
  const [showConfirmForm, setShowConfirmForm] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("sign-up");
  const [showTabsForNotEntered, setShowTabsForNotEntered] =
    useState<boolean>(true);
  const [activeInnerTab, setActiveInnerTab] = useState<string>("set-data");
  const [username, setUsername] = useState<string>();
  const [showSummarizedPersonalData, setShowSummarizedPersonalData] =
    useState<boolean>(false);
  const [age, setAge] = useState<string>();
  const [height, setHeight] = useState<string>();
  const [income, setIncome] = useState<string>();
  const [results, setResults] = useState<TypeResults>();

  type TypeResults = {
    UserId: { S: string };
    age: { N: string };
    height: { N: string };
    income: { N: string };
  }[];

  const client = useMemo(
    () => new CognitoIdentityProviderClient({ region: "sa-east-1" }),
    []
  );

  const showError = (id: string, message: string): void => {
    const element: HTMLElement | null = document.getElementById(id);
    if (element) {
      element.textContent = message;
      element.style.color = "red";
    }
  };

  const allOK = (): void => {
    let element: HTMLElement | null = document.getElementById(
      "error-username-signup"
    );
    if (element) {
      element.textContent = "Looks good!";
      element.style.color = "violet";
    }

    element = document.getElementById("error-email-signup");
    if (element) {
      element.textContent = "Looks good!";
      element.style.color = "violet";
    }

    element = document.getElementById("error-password-signup");
    if (element) {
      element.textContent = "Looks good!";
      element.style.color = "violet";
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setValidate(true);

      const form = e.currentTarget;
      if (form.checkValidity() === true) {
        setSpinnerOn(true);

        const formData = new FormData(form);
        const username = formData.get("username")?.toString();
        const email = formData.get("email")?.toString();
        const password = formData.get("password")?.toString();
        const confirmPassword = formData.get("confirm_password")?.toString();

        if (password === confirmPassword) {
          const userPoolId = process.env.REACT_APP_COGNITO_USER_POOL_ID;
          const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;

          const signUpParams = {
            ClientId: clientId,
            Username: username,
            Password: password,
            UserAttributes: [
              { Name: "email", Value: email }, // Se puede agregar más atributos personalizados si es necesario
            ],
            UserPoolId: userPoolId,
          };

          try {
            const signUpResponse = await client.send(
              new SignUpCommand(signUpParams)
            );
            console.log("Usuario registrado exitosamente:", signUpResponse);
            allOK();
            setValidate(false);
            setSpinnerOn(false);
            setShowConfirmForm(true);
          } catch (error: any) {
            console.error(error);
            setSpinnerOn(false);
            if (error.name === "InvalidPasswordException")
              showError(
                "error-password-signup",
                "La password debe tener al menos 8 caracteres y al menos un número"
              );

            if (error.name === "InvalidParameterException")
              showError(
                "error-email-signup",
                "Debe ingresar una dirección de correo válida"
              );
          }
        }
      }
    },
    [client]
  );

  const handleConfirmForm = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setValidateConfirmForm(true);

      const form = e.currentTarget;
      if (form.checkValidity()) {
        const formData = new FormData(form);
        const username = formData.get("username")?.toString();
        const code = formData.get("code")?.toString();

        const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
        try {
          const confirmationResponse = await client.send(
            new ConfirmSignUpCommand({
              ClientId: clientId,
              Username: username,
              ConfirmationCode: code,
            })
          );
          console.log("ConfirmationResponse: ", confirmationResponse);
          setActiveTab("sign-in");
        } catch (error: any) {
          console.error(error);
        }
      }
    },
    [client]
  );

  const handleSignInSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setValidate(true);

      const form = e.currentTarget;
      if (form.checkValidity()) {
        const formData = new FormData(form);
        const username = formData.get("username1")?.toString();
        const password = formData.get("password1")?.toString();

        setUsername(username);
        console.log("username en handleSignInSubmit: ", username);

        if (!username || !password)
          throw new Error("Campos Username y Password deben contener valores");

        const authParameters = {
          USERNAME: username,
          PASSWORD: password,
        };

        const initiateAuthParams = {
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
          AuthParameters: authParameters,
        };

        const initiateAuthCommand = new InitiateAuthCommand(initiateAuthParams);

        try {
          const response = await client.send(initiateAuthCommand);

          let idToken: string;
          let refreshToken: string;

          response.AuthenticationResult?.IdToken
            ? (idToken = response.AuthenticationResult.IdToken)
            : (idToken = "");

          refreshToken = response.AuthenticationResult?.RefreshToken || "";

          const expiresIn = new Date(
            new Date().getTime() +
              (response.AuthenticationResult?.ExpiresIn || 0) * 1000
          );
          Cookies.set("idToken", idToken, {
            expires: expiresIn,
          });
          Cookies.set("refreshToken", refreshToken);
          Cookies.get("idToken")
            ? setShowTabsForNotEntered(false)
            : setShowTabsForNotEntered(true);

          setActiveTab("compare");
        } catch (error: any) {
          setShowTabsForNotEntered(true);
          console.error(error);
        }
      }
    },
    [client]
  );

  const handleSetDataForm = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();

      const form = e.currentTarget;
      const formData = new FormData(form);

      const age = formData.get("age")?.toString();
      const height = formData.get("height")?.toString();
      const monthlyIncome = formData.get("monthly-income")?.toString();

      if (!age || !height || !monthlyIncome) return;

      const idToken = Cookies.get("idToken");
      if (!idToken) {
        console.error(
          "La cookie idToken está obsoleta. Reloguee y vuelva a ejecutar la operación."
        );
        return;
      }
      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: idToken,
        },
        body: JSON.stringify({
          age: age.toString(),
          height: height.toString(),
          income: monthlyIncome.toString(),
          userId: username,
        }),
      };

      try {
        if (!process.env.REACT_APP_API_GATEWAY_POST_ENTER_USER)
          throw new Error(
            "La variable de entorno para llamar a la Api POST está vacía"
          );
        const response: Response = await fetch(
          process.env.REACT_APP_API_GATEWAY_POST_ENTER_USER,
          requestOptions
        );

        if (!response.ok)
          throw new Error(`Error: ${response.status} ${response.statusText}`);

        type responseDataType = {
          response: {
            statusCode: number;
            userId: string;
            age: string;
            height: string;
            income: string;
          };
        };

        const responseData: responseDataType = await response.json();

        setAge(responseData.response.age);
        setHeight(responseData.response.height);
        setIncome(responseData.response.income);

        setShowSummarizedPersonalData(true);
      } catch (error: any) {
        console.error("Error en la request POST: ", error);
      }
    },
    [username]
  );

  const handleCleanDataOnServer = async (
    e: React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    e.preventDefault();
    const idToken = Cookies.get("idToken");
    if (!idToken) {
      console.error(
        "La cookie idToken está obsoleta. Reloguee y vuelva a ejecutar la operación."
      );
      return;
    }
    const requestOptions = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: idToken,
      },
    };

    try {
      if (!process.env.REACT_APP_API_GATEWAY_POST_ENTER_USER)
        throw new Error(
          "La variable de entorno para llamar a la Api POST está vacía"
        );
      const response: Response = await fetch(
        process.env.REACT_APP_API_GATEWAY_POST_ENTER_USER,
        requestOptions
      );

      if (!response.ok)
        throw new Error(`Error: ${response.status} ${response.statusText}`);

      const responseData = await response.json();

      console.log("response: ", responseData);
    } catch (error: any) {
      console.error("Error en la request DELETE: ", error);
    }
  };

  const handleGetAllData = async (
    e: React.MouseEvent<HTMLElement>
  ): Promise<void> => {
    e.preventDefault();
    const idToken = Cookies.get("idToken");
    if (!idToken) {
      console.error(
        "La cookie idToken está obsoleta. Reloguee y vuelva a ejecutar la operación."
      );
      return;
    }
    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: idToken,
      },
    };

    try {
      if (!process.env.REACT_APP_API_GATEWAY_GET_ALL_USERS)
        throw new Error(
          "La variable de entorno para llamar a la Api GET está vacía"
        );
      const response: Response = await fetch(
        process.env.REACT_APP_API_GATEWAY_GET_ALL_USERS,
        requestOptions
      );

      if (!response.ok)
        throw new Error(`Error: ${response.status} ${response.statusText}`);

      const responseData: { statusCode: number; body: TypeResults } =
        await response.json();
      setResults(responseData.body);
    } catch (error: any) {
      console.error("Error en la request GET: ", error);
    }
  };

  return (
    <Tab.Container
      activeKey={activeTab}
      onSelect={(key) => setActiveTab(key || "sign-up")}
    >
      <Row className="bg-light">
        <Nav variant="underline" className="d-flex justify-content-start">
          <Col sm="2" className="text-center me-3 text-secondary fs-5 my-auto">
            <Nav.Item className="text-secondary fs-5">
              Compare Yourself!
            </Nav.Item>
          </Col>
          <Col
            sm="1"
            className={`me-3 text-start ${
              !showTabsForNotEntered ? "d-none" : ""
            }`}
          >
            <Nav.Item>
              <Nav.Link
                eventKey="sign-up"
                className="text-secondary text-center fs-5"
              >
                Sign Up
              </Nav.Link>
            </Nav.Item>
          </Col>
          <Col
            sm="1"
            className={`text-start ${!showTabsForNotEntered ? "d-none" : ""}`}
          >
            <Nav.Item>
              <Nav.Link
                eventKey="sign-in"
                className="text-secondary text-center fs-5"
              >
                Sign In
              </Nav.Link>
            </Nav.Item>
          </Col>
          <Col
            sm="1"
            className={`text-start ${!showTabsForNotEntered ? "" : "d-none"}`}
          >
            <Nav.Item>
              <Nav.Link
                eventKey="compare"
                className="text-secondary text-center fs-5"
              >
                Compare
              </Nav.Link>
            </Nav.Item>
          </Col>
        </Nav>
      </Row>

      <Tab.Content>
        <Tab.Pane eventKey="sign-in">
          <Form
            noValidate
            validated={validate}
            onSubmit={(e) => handleSignInSubmit(e)}
            className={`mt-5 p-5 bg-secondary ${styles.form_styles}`}
          >
            <Container fluid>
              <Form.Group as={Row}>
                <Form.Label className="text-center">Username</Form.Label>
                <Form.Control name="username1" required type="text" />
                <Form.Control.Feedback style={{ color: "violet" }}>
                  Looks good!
                </Form.Control.Feedback>
                <Form.Control.Feedback type="invalid">
                  Please, choose a username
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group as={Row} className="mt-3">
                <Form.Label className="text-center">Password</Form.Label>
                <Form.Control name="password1" required type="password" />
                <Form.Control.Feedback style={{ color: "violet" }}>
                  Looks good!
                </Form.Control.Feedback>
                <Form.Control.Feedback type="invalid">
                  Please, set a password
                </Form.Control.Feedback>
              </Form.Group>
            </Container>

            <Row className="mt-3">
              <Col className="text-center">
                <Button type="submit">Submit</Button>
              </Col>
            </Row>
          </Form>
        </Tab.Pane>

        <Tab.Pane eventKey="sign-up">
          <Form
            noValidate
            validated={validate}
            onSubmit={(e) => {
              handleSubmit(e);
            }}
            className={`mt-5 p-5 bg-secondary ${styles.form_styles}`}
          >
            <Container fluid>
              <Form.Group as={Row}>
                <Form.Label className="text-center">Username</Form.Label>
                <Form.Control name="username" required type="text" />
                <Form.Control.Feedback
                  id="error-username-signup"
                  style={{ color: "violet" }}
                >
                  Looks good!
                </Form.Control.Feedback>
                <Form.Control.Feedback
                  id="error-username-signup"
                  type="invalid"
                >
                  Please, choose a username
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group as={Row} className="mt-3">
                <Form.Label className="text-center">Mail</Form.Label>
                <Form.Control name="email" required type="email" />
                <Form.Control.Feedback
                  id="error-email-signup"
                  style={{ color: "violet" }}
                >
                  Looks good!
                </Form.Control.Feedback>
                <Form.Control.Feedback id="error-email-signup" type="invalid">
                  Please, enter an email address
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group as={Row} className="mt-3">
                <Form.Label className="text-center">Password</Form.Label>
                <Form.Control name="password" required type="password" />
                <Form.Control.Feedback
                  id="error-password-signup"
                  style={{ color: "violet" }}
                >
                  Looks good!
                </Form.Control.Feedback>
                <Form.Control.Feedback
                  id="error-password-signup"
                  type="invalid"
                >
                  Please, set a password
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group as={Row} className="mt-3">
                <Form.Label className="text-center">
                  Confirm Password
                </Form.Label>
                <Form.Control
                  name="confirm_password"
                  required
                  type="password"
                />
                <Form.Control.Feedback style={{ color: "violet" }}>
                  Looks good!
                </Form.Control.Feedback>
                <Form.Control.Feedback type="invalid">
                  Please, set a password
                </Form.Control.Feedback>
              </Form.Group>
            </Container>

            <Row className="mt-4">
              <Col className="text-center">
                <Button type="submit">Submit</Button>
              </Col>
            </Row>
          </Form>

          <Row className="d-flex justify-content-center mt-5 pb-5">
            <Col className="text-center">
              {spinnerOn && <Spinner animation="grow" />}
              {showConfirmForm && (
                <Form
                  noValidate
                  validated={validateConfirmForm}
                  className={`mt-5 p-5 bg-secondary ${styles.form_styles}`}
                  onSubmit={handleConfirmForm}
                >
                  <Container fluid>
                    <Form.Group as={Row}>
                      <Form.Label className="text-center">Username</Form.Label>
                      <Form.Control name="username" required type="text" />
                      <Form.Control.Feedback>Looks good!</Form.Control.Feedback>
                      <Form.Control.Feedback type="invalid">
                        Please, choose a username
                      </Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group as={Row} className="mt-3">
                      <Form.Label>Validation Code</Form.Label>
                      <Form.Control name="code" required type="text" />
                      <Form.Control.Feedback>Looks good!</Form.Control.Feedback>
                      <Form.Control.Feedback type="invalid">
                        Please, enter a validation code number
                      </Form.Control.Feedback>
                    </Form.Group>
                    <Button type="submit" className="mt-4">
                      Send code
                    </Button>
                  </Container>
                </Form>
              )}
            </Col>
          </Row>
        </Tab.Pane>

        <Tab.Pane eventKey="compare">
          <h1 className="mt-4 text-center">Your Results: {username}</h1>
          <Tab.Container
            activeKey={activeInnerTab}
            onSelect={(key) => setActiveInnerTab(key || "set-data")}
          >
            <Nav as={Row} className="d-flex justify-content-center">
              <Nav.Item as={Col} xs="2">
                <Nav.Link
                  as={Button}
                  eventKey="set-data"
                  onClick={() => setShowSummarizedPersonalData(false)}
                >
                  Set Data
                </Nav.Link>
              </Nav.Item>
              <Nav.Item as={Col} xs="2">
                <Nav.Link as={Button} eventKey="clear-data">
                  Clear Data on Server
                </Nav.Link>
              </Nav.Item>
              <Nav.Item as={Col} xs="2">
                <Nav.Link
                  as={Button}
                  eventKey="get-results"
                  onClick={(e) => handleGetAllData(e)}
                >
                  Get Results
                </Nav.Link>
              </Nav.Item>
            </Nav>
            <Tab.Content className="pt-5">
              <Tab.Pane eventKey="set-data">
                {!showSummarizedPersonalData && (
                  <Form
                    noValidate
                    className={`${styles.form_styles}`}
                    onSubmit={(e) => handleSetDataForm(e)}
                  >
                    <Form.Group as={Row}>
                      <Form.Label className="text-center">Age</Form.Label>
                      <Form.Control required type="number" name="age" />
                    </Form.Group>
                    <Form.Group as={Row} className="mt-3">
                      <Form.Label className="text-center">
                        Height (inch)
                      </Form.Label>
                      <Form.Control required type="number" name="height" />
                    </Form.Group>
                    <Form.Group as={Row} className="mt-3">
                      <Form.Label className="text-center">
                        Monthly income (USD)
                      </Form.Label>
                      <Form.Control
                        required
                        type="number"
                        name="monthly-income"
                      />
                    </Form.Group>

                    <Row className="mt-5 d-flex justify-content-center">
                      <Col className="text-center">
                        <Button type="submit">Submit</Button>
                      </Col>
                    </Row>
                  </Form>
                )}
                {showSummarizedPersonalData && (
                  <Container fluid className="mt-5">
                    <h1 className="text-center">Select Filter</h1>
                    <Row>
                      <Col xs="12" className="text-center">
                        Your Age: {age}
                      </Col>
                      <Col xs="12" className="text-center">
                        Your Height: {height}
                      </Col>
                      <Col xs="12" className="text-center">
                        Your Income: {income}
                      </Col>
                    </Row>
                  </Container>
                )}
              </Tab.Pane>

              {/* Tab Pane de Clear Data On Server */}
              <Tab.Pane eventKey="clear-data" className="text-center">
                <Button onClick={handleCleanDataOnServer}>
                  Start the process
                </Button>
              </Tab.Pane>

              {/* Tab Pane de Get Results */}
              <Tab.Pane eventKey="get-results" className="text-center">
                {results?.map((element: any) => (
                  <Row
                    key={element.UserId.S}
                    className="d-flex justify-content-center"
                  >
                    <Col xs="1">{element.UserId.S}</Col>
                    <Col xs="1">{element.age.N}</Col>
                    <Col xs="1">{element.height.N}</Col>
                    <Col xs="1">{element.income.N}</Col>
                  </Row>
                ))}
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Tab.Pane>
      </Tab.Content>
    </Tab.Container>
  );
};

export default Home;
