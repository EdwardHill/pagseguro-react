import React from "react";
import styled, { css } from "styled-components";
import { DirectPayment, Loading } from "../../../src";
import config from "../../config";
import axios from "axios";
import style from "./style.css";
import jwtDecode from "jwt-decode";

const Home = styled.div`
	position: relative;
`;

const LoadingContainer = styled.div`
	position: absolute;
	width: 100%;
	height: 100%;
	z-index: 1;
	background: rgba(245, 245, 245, 0.9);

	div {
		left: 50%;
		top: 40%;
	}
`;

const Feedback = styled.div`
	background: #f5f5f5;
	padding-top: 50px;
	padding-bottom: 50px;
	box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.18);
	text-align: center;
	width: 100%;

	h1 {
		font-size: 1.5em;
		color: #08bd75;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0 auto;
		display: table;
	}

	${(props) =>
		props.error &&
		css`
			background: none;
			color: red;
			h1 {
				color: red;
			}
		`}
`;

export default class Component extends React.Component {
	/**
	 * constructor
	 *
	 * @param {Object} props
	 */
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
			error: null,
			success: null,
			paymentLink: null,
			paid: false,
			afiliadoCode: "",
			idService: "",
			frete: "",
			session: "",

			env: "",

			// Informações do comprador
			sender: {
				name: "",
				email: "",
				phone: {
					areaCode: "",
					number: "",
				},
				document: {
					type: "CPF",
					value: "",
				},
			},

			// Endereço de entrega
			shipping: {
				addressRequired: false, //Aqui decidimos se vai ter frete ou não.
				/*
				type: 3,
				cost: 10.00,
				street: 'Av Joao Lima',
				number: 55,
				complement: 'Casa',
				district: 'Campeche',
				city: 'Florianopolis',
				state: 'SC',
				country: 'BRA',
				postalCode: '88063333'
				*/
			},

			// Endereço de cobrança
			billing: {
				// street: "Av Joao Lima",
				// number: 55,
				// complement: "Casa",
				// district: "Centro",
				// city: "Cachoeirinha",
				// state: "PE",
				country: "BRA",
				// postalCode: "55380000",
			},

			// produtos

			items: [
				// {
				// 	id: "",
				// 	description: "",
				// 	quantity: "",
				// 	amount: "",
				// },
			],

			// Cartão de crédito
			creditCard: {
				//pagamento parcelado sem juros: PRECISA SER MAIOR MAIOR OU IGUAL A "2" !
				maxInstallmentNoInterest: 3,
			},

			extraAmount: 0,
			reference: "",
		};
	}

	/**
	 * componentDidMount
	 */
	componentDidMount() {
		const { session } = this.state;
		const { name } = this.state;
		const items = this.state;
		const afiliadoCode = this.state;

		const result = new URLSearchParams(window.location.search);
		const token = result.get("token");
		const paymentPayload = result.get("payment");

		const decoded = jwtDecode(token);
		console.log(decoded);
		let decodedPaymentPayload;
		try {
			decodedPaymentPayload = JSON.parse(atob(paymentPayload));
		} catch (e) {
			alert("Objeto de pagamento inválido!");
			return;
		}

		console.log(decodedPaymentPayload);

		if (!name) {
			this.setState({
				sender: { name: decoded.name, email: decoded.sub },
			});
		}

		this.setState(
			{
				frete: decodedPaymentPayload.frete[0].price,
				idService: decodedPaymentPayload.frete[0].idService,
				items: decodedPaymentPayload.items,
				afiliadoCode: decodedPaymentPayload.afiliadoCode,
				reference: decoded.id
			},
			() => console.log(this.state)
		);
		if (!session) {
			axios
				.post(`${config.endpoint}/session`)
				.then((res) => {
					this.setState({ session: res.data.content });
				})
				.catch((err) => console.error(err));
		}
	}

	/**
	 * onSubmit
	 */
	onSubmit(data) {
		console.log("sending to API...");
		console.log(data);
		data.afiliadoCode = this.state.afiliadoCode;
		data.idService = this.state.idService;
		data.frete = this.state.frete;
		this.setState({
			loading: true,
			error: null,
			success: "",
			paymentLink: null,
		});

		axios
			.post(`${config.endpoint}/directPayment/payment`, data)
			.then((res) => {
				const { content } = res.data;

				let newState = {};

				switch (content.paymentMethod.typeId) {
					case 2:
						newState = {
							success:
								"Acesse o link abaixo para imprimir o boleto",
							paymentLink: content.paymentLink,
						};
						break;

					case 3:
						newState = {
							success: "Acesse seu banco e finalize a transação",
							paymentLink: content.paymentLink,
						};
						break;

					case 1:
						newState = {
							success: "Pagamento realizado com sucesso",
						};
						break;
				}

				this.setState({
					paid: true,
					loading: false,
					...newState,
				});
			})
			.catch((err) => {
				const { content } = err.response.data;
				const error = Array.isArray(content) ? content : [content];
				this.setState({
					loading: false,
					error,
				});
			});
	}

	/**
	 * onError
	 */
	onError(error) {
		console.error(error);
	}

	/**
	 * render
	 */
	render() {
		if (!this.state.session) {
			return null;
		}

		return (
			<Home>
				{this.state.loading && (
					<LoadingContainer>
						<Loading />
					</LoadingContainer>
				)}

				{!this.state.paid && (
					<DirectPayment
						env="sandbox"
						session={this.state.session}
						extraAmount={this.state.extraAmount}
						reference={this.state.reference}
						creditCard={this.state.creditCard}
						sender={this.state.sender}
						shipping={this.state.shipping}
						billing={this.state.billing}
						items={this.state.items}
						exclude={
							[
								// 'CREDIT_CARD',
								//'ONLINE_DEBIT',
								//'BOLETO'
							]
						}
						onError={this.onError.bind(this)}
						onSubmit={this.onSubmit.bind(this)}
						/*
					hiddenSenderForm
					hiddenShippingForm
					hiddenBillingForm
				*/
					/>
				)}

				{this.state.success && (
					<Feedback>
						<h1>{this.state.success}</h1>
					</Feedback>
				)}

				{this.state.error && (
					<Feedback error>
						<ul>
							{/*this.state.error.map((error, key) => (
								<li key={key}>
									{error.code} - {error.message}
								</li>
							))*/}
						</ul>
					</Feedback>
				)}

				{this.state.paymentLink && (
					<Feedback>
						<a href={this.state.paymentLink} target="_blank">
							ACESSAR
						</a>
					</Feedback>
				)}
			</Home>
		);
	}
}
