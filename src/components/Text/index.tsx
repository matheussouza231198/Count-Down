
import './style.scss'

import { useState, useEffect } from 'react';
import { dashboard, bitable, DashboardState, ITableMeta, FilterConjunction, FilterInfoCondition, FilterOperator, IOpenCellValue } from "@lark-base-open/js-sdk";
import { Button, Select, Input } from '@douyinfe/semi-ui';

import { Item } from '../Item';
import { useTranslation } from 'react-i18next';

interface ITextConfig {
	datasource?: string | null,
	conditions: FilterInfoCondition[],
	title: {
		show: boolean,
		label: string,
		fieldId?: string | null,
	},
	description: {
		show: boolean,
		label: string,
		fieldId?: string | null,
	}
}

export function Text() {
	const { t, i18n } = useTranslation();

	const [tables, setTables] = useState<ITableMeta[]>([])
	const [tableFields, setTableFields] = useState<{ value: string, label: string }[]>([])

	const [config, setConfig] = useState<ITextConfig>({
		title: {
			show: true,
			label: 'ORDEM DE PRODUÇÂO 生产订单',
		},
		description: {
			show: true,
			label: 'Modelo 型号',
		},
		conditions: []
	});

	const [values, setValues] = useState({
		title: 'N/D',
		description: 'N/D',
	});

	const getFieldValue = (fields: {[fieldId: string]: IOpenCellValue}, fieldId?: string | null) => {
		if (!fieldId) {
			return 'N/D';
		}

		const field = fields[fieldId];

		if (field == null) {
			return 'N/D';
		}

		const value = Array.isArray(field)
			? field[0]
			: field;

		if (value == null) {
			return 'N/D';
		}

		if (typeof value === 'object') {
			if ('value' in value && value.value != null) {
				return String(value.value);
			}

			if ('address' in value && value.address != null) {
				return String(value.address);
			}

			if ('name' in value && value.name != null) {
				return String(value.name);
			}

			if ('text' in value && value.text != null) {
				return String(value.text);
			}

			return 'N/D';
		}

		return String(value);
	};

	const getValues = async () => {
		if (!config.datasource || !config.title.fieldId || !config.description.fieldId) {
			setValues({ title: 'N/D', description: 'N/D'})
			return;
		}

		const table = await bitable.base.getTableById(config.datasource!);
		const res = await table.getRecordsByPage({
			pageSize: 1,
			filter: {
				conjunction: FilterConjunction.And,
				conditions: config.conditions
			}
		});

		if (!res || res.records.length < 1) {
			setValues({ title: 'N/D', description: 'N/D'})
			return;
		}

		const record = res.records[0];
		const title = getFieldValue(record.fields, config.title.fieldId)
		const description = getFieldValue(record.fields, config.description.fieldId)

		setValues({
			title,
			description
		})
	}
	
	const addFillter = () => {
		const conditions = config.conditions

		conditions.push({
			fieldId: tableFields[0]?.value ?? '',
			operator: FilterOperator.Is,
			value: '',
		})
		setConfig({
			...config,
			conditions
		})
	}

	const getTableFields  = async () => {
		if (! config.datasource) {
			return
		}

		const table = await bitable.base.getTableById(config.datasource)
		const fields = await table.getFieldMetaList();

		setTableFields(
			fields.map(f => ({
				value: f.id,
				label: f.name,
			}))
		);
	}

	const updateCondition = (index: number, data: Partial<FilterInfoCondition>) => {
		setConfig((pre) => {
			return {
				...pre,
				conditions: pre.conditions.map((condition, i) => {
					if (i === index) {
						return {
							...condition,
							...data,
						}  as FilterInfoCondition;
					}

					return condition;
				})
			}
		})
		
	};

	const showConfigPanel = dashboard.state === DashboardState.Config || dashboard.state === DashboardState.Create

	useEffect(() => {
		if (showConfigPanel) {
			getTableFields();
		}
	}, [config.datasource])

	useEffect(() => {
		if (showConfigPanel) {
			bitable.base.getTableMetaList().then(r => setTables(r))
		}
	}, [])

	useEffect(() => {
		const loadConfig = async () => {
			const data = await dashboard.getConfig();

			if (data.customConfig) {
				setConfig(data.customConfig as any);
			}
		}
		loadConfig();
	}, [])

	useEffect(() => {
		const offConfigChange = dashboard.onConfigChange(({ data }) => {
			const { customConfig } = data;
			if (customConfig) {
				setConfig(customConfig as any)
			}
		})

		return () => {
			offConfigChange();
		}
	}, [])

	useEffect(() => {
		getValues()
	}, [config])

	useEffect(() => {
		if (!config.datasource) {
			return
		}

		let cleanup: (() => void) | undefined;

		async function setup() {
			const table = await bitable.base.getTableById(config.datasource!);

			const offAdd = table.onRecordAdd(_ => {
				getValues();
				console.log('add');
			})

			const offModify = table.onRecordModify((event) => {
				getValues();
				console.log('modify');
			});

			const offDelete = table.onRecordDelete((event) => {
				getValues();
				console.log('delete');
			});

			cleanup = () => {
				offAdd();
				offModify();
				offDelete();
			}
		}

		setup();

		return () => {
			cleanup?.();
		};

	}, [config.datasource])


	return (
		<main className='main main-config'>
			<section className='content'>
				{config.title.show && (<span className='content-top'>{config.title.label}</span>) }

				<span className='content-middle' style={{ marginBlock: 'auto' }}>
					{values.title}
				</span>
				
				{config.description.show && (
					<div className='content-bottom'>
						<span>{config.description.label}</span>
						<span>{values.description}</span>
					</div>
				)}
			</section>
			
			{ showConfigPanel && (
				<aside className='config-panel'>
					<div className='form'>
						<Item label='Fonte de dados'>
							<Select style={{ width: '100%'}} value={config.datasource ?? ''} onChange={value => {
								if (typeof value === 'string') {
									setConfig({
										...config,
										datasource: value,
										conditions: [],
									})
								}
							}}>
								{
									tables.map(table => (
										<Select.Option value={table.id}>{table.name}</Select.Option>
									))
								}
							</Select>
						</Item>

						<Item label={t('title')}>
							<Input
								value={config.title.label}
								onChange={(label) => setConfig({ ...config, title: { ...config.title, label } }) }
							/>
						</Item>

						<Item label={t('field')}>
							<Select
								value={config.title.fieldId?.toString()}
								style={{ width: '100%' }}
								optionList={tableFields}
								onChange={(fieldId) => {
									if  (typeof fieldId === 'string' || fieldId === null || fieldId === undefined) {
										setConfig({ ...config, title: { ...config.title, fieldId } })
									}
								}}
							/>
						</Item>

						<Item label={t('description')}>
							<Input
								value={config.description.label}
								onChange={(label) => setConfig({ ...config, description: { ...config.description, label } }) }
							/>
						</Item>

						<Item label={t('field')}>
							<Select
								value={config.description.fieldId?.toString()}
								style={{ width: '100%' }}
								optionList={tableFields}
								onChange={(fieldId) => {
									if  (typeof fieldId === 'string' || fieldId === null || fieldId === undefined) {
										setConfig({ ...config, description: { ...config.description, fieldId } })
									}
								}}
							/>
						</Item>

						<Item label='Configurar condições de filtro'>
							<div>
								<ul className='filters'>
									{
										config.conditions.map((condition, index) => (
											<li className='filter-item'>
												<Select
													value={condition.fieldId} style={{ width: '30%' }}
													optionList={tableFields}
													onChange={(value) => {
														if  (typeof value === "string") {
															updateCondition(index, { fieldId: value })
														}
													}}
												/>
												
												
												<Select
													value={condition.operator}
													style={{ width: '20%' }}
													optionList={Object.values(FilterOperator).map(operator => {
														return { value: operator, label: operator }
													})}
													onChange={(value) => {
														if  (value) {
															updateCondition(index, { operator: value as FilterOperator })
														}
													}}
												/>

												<Input
													style={{ width: '40%' }}
													value={condition.value as string}
													onChange={(value) => updateCondition(index, { value })}
												/>

												{ config.conditions.length > 1 && (
													<Button
														theme="borderless"
														onClick={() => {
															setConfig({
																...config,
																conditions: config.conditions.filter((_, i) => i !== index)
															});
														}}
													>
														X
													</Button>
												) }
											</li>
										))
									}
								</ul>
								<Button
									theme='borderless'
									type='tertiary'
									size='small'
									onClick={addFillter}
								>
									+ Adicionar condição
								</Button>
							</div>
						</Item>
					</div>
					<Button
						className='btn'
						theme='solid'
						onClick={() => {
							dashboard.saveConfig({
								customConfig: config,
								dataConditions: [],
							} as any)
						}}
					>
						{t('confirm')}
					</Button>
				</aside>
			)}
		</main>
	);
}

